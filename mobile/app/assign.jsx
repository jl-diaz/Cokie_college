import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../src/utils/api';
import { Calendar, RefreshCw, Check, Clock, User, BookOpen, ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';
import StatusModal from '../src/components/StatusModal';

// ======================================================================
// 📷 SLOTS DE IMÁGENES PERSONALIZADAS:
// Coloca aquí tus imágenes usando require('../assets/tu_imagen.png').
// Si están en null, se mostrarán los iconos e ilustraciones por defecto.
// ======================================================================
export const EXISTING_SCHEDULE_CARD_IMAGE = null; // Ej: require('../assets/images/schedule_exists.png')
export const DELETE_WARNING_MODAL_IMAGE = null;   // Ej: require('../assets/images/delete_warning.png')
export const SUCCESS_MODAL_IMAGE = null;          // Ej: require('../assets/images/success.png')

export default function AssignScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { showAlert } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [proposal, setProposal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedClassrooms, setExpandedClassrooms] = useState({});
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);
  const [checkingSchedule, setCheckingSchedule] = useState(true);

  // Estados para los modales
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successModalConfig, setSuccessModalConfig] = useState({ title: '', message: '' });

  useEffect(() => {
    checkExistingSchedule();
  }, []);

  const checkExistingSchedule = async () => {
    setCheckingSchedule(true);
    try {
      // 1. Revisar si hay horario en salones del coordinador
      const classRes = await api.get('/coordinator/classrooms');
      const classrooms = classRes.data || [];
      if (classrooms.length > 0) {
        const schedRes = await api.get(
          `/coordinator/classrooms/schedule?grade=${classrooms[0].grade}&section=${classrooms[0].section}`
        );
        if (schedRes.data && schedRes.data.length > 0) {
          setHasExistingSchedule(true);
          return;
        }
      }

      // 2. Fallback: revisar horario asignado a docentes del coordinador
      const teachRes = await api.get('/coordinator/teachers');
      const teachers = teachRes.data || [];
      if (teachers.length > 0) {
        const schedRes = await api.get(`/coordinator/teachers/${teachers[0].id}/schedule`);
        if (schedRes.data && schedRes.data.length > 0) {
          setHasExistingSchedule(true);
          return;
        }
      }

      setHasExistingSchedule(false);
    } catch (err) {
      console.log('Error checking existing schedule:', err);
      setHasExistingSchedule(false);
    } finally {
      setCheckingSchedule(false);
    }
  };

  const deleteExistingSchedule = async () => {
    setDeleting(true);
    try {
      await api.delete('/coordinator/schedules');
      setProposal([]);
      setExpandedClassrooms({});
      setHasExistingSchedule(false);
      setDeleteModalVisible(false);

      // Mostrar modal de confirmación de éxito referenciado
      setSuccessModalConfig({
        title: t('assign.scheduleDeletedSuccessTitle', 'Horario Eliminado'),
        message: t('assign.scheduleDeletedSuccessDesc', 'El horario anterior ha sido borrado con éxito. Ya puedes generar una nueva propuesta.')
      });
      setSuccessModalVisible(true);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.response?.data?.error || t('assign.saveError', 'No se pudo eliminar el horario.')
      });
    } finally {
      setDeleting(false);
    }
  };

  const generateProposal = async () => {
    setLoading(true);
    setProposal([]);
    setExpandedClassrooms({});
    try {
      const res = await api.get('/coordinator/schedules/generate');
      const data = res.data || [];
      setProposal(data);
    } catch (error) {
      const errData = error.response?.data;
      
      if (errData?.code !== 'SCHEDULE_EXISTS') {
        console.error(error);
      }
      
      if (errData?.code === 'SCHEDULE_EXISTS') {
        setHasExistingSchedule(true);
      } else {
        showAlert({
          type: 'error',
          title: t('common.error', 'Error'),
          message: errData?.error || t('assign.saveError', 'No se pudo generar la propuesta de horario.')
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const applySchedule = async () => {
    if (proposal.length === 0) return;
    setApplying(true);
    try {
      await api.post('/coordinator/schedules/apply', { proposal });
      setProposal([]); // Reset after applying
      setExpandedClassrooms({});
      setHasExistingSchedule(true);

      // Modal de éxito al aplicar
      setSuccessModalConfig({
        title: t('assign.scheduleAppliedSuccessTitle', 'Horario Aplicado'),
        message: t('assign.scheduleAppliedSuccessDesc', 'El horario ha sido guardado y aplicado correctamente.')
      });
      setSuccessModalVisible(true);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('common.error', 'Error'),
        message: error.response?.data?.error || t('assign.saveError', 'No se pudo aplicar el horario.')
      });
    } finally {
      setApplying(false);
    }
  };

  const getDayName = (dayNum) => {
    const days = {
      1: t('assign.monday', 'Lunes'),
      2: t('assign.tuesday', 'Martes'),
      3: t('assign.wednesday', 'Miércoles'),
      4: t('assign.thursday', 'Jueves'),
      5: t('assign.friday', 'Viernes')
    };
    return days[dayNum] || t('assign.unknown', 'Desconocido');
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  const toggleClassroom = (classKey) => {
    setExpandedClassrooms(prev => ({
      ...prev,
      [classKey]: !prev[classKey]
    }));
  };

  const toggleAllClassrooms = (classKeys, expand) => {
    const nextState = {};
    classKeys.forEach(key => {
      nextState[key] = expand;
    });
    setExpandedClassrooms(nextState);
  };

  const renderProposal = () => {
    if (proposal.length === 0) return null;

    // Agrupar por salón
    const groupedByClass = {};
    proposal.forEach(p => {
      const key = `${p.grade}º '${p.section}'`;
      if (!groupedByClass[key]) groupedByClass[key] = [];
      groupedByClass[key].push(p);
    });

    const classKeys = Object.keys(groupedByClass).sort();
    const allExpanded = classKeys.length > 0 && classKeys.every(k => !!expandedClassrooms[k]);

    return (
      <View style={styles.proposalContainer}>
        {/* Barra superior de controles del acordeón */}
        <View style={styles.accordionActionsRow}>
          <Text style={styles.classroomsCountText}>
            {classKeys.length} {t('assign.classroom', 'Salón')}{classKeys.length > 1 ? 'es' : ''}
          </Text>
          <TouchableOpacity 
            onPress={() => toggleAllClassrooms(classKeys, !allExpanded)}
            style={styles.toggleAllBtn}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleAllBtnText}>
              {allExpanded ? t('assign.collapseAll', 'Colapsar todos') : t('assign.expandAll', 'Expandir todos')}
            </Text>
          </TouchableOpacity>
        </View>

        {classKeys.map(classKey => {
          const items = groupedByClass[classKey];
          const isExpanded = !!expandedClassrooms[classKey];

          // Agrupar los items del salón por día de la semana (1 a 5)
          const itemsByDay = {};
          items.forEach(item => {
            const day = item.day_of_week;
            if (!itemsByDay[day]) itemsByDay[day] = [];
            itemsByDay[day].push(item);
          });
          const sortedDays = Object.keys(itemsByDay).map(Number).sort((a, b) => a - b);

          return (
            <View key={classKey} style={styles.accordionCard}>
              <TouchableOpacity 
                style={styles.accordionHeader} 
                onPress={() => toggleClassroom(classKey)}
                activeOpacity={0.7}
              >
                <View style={styles.accordionHeaderLeft}>
                  <BookOpen size={18} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.accordionClassTitle}>
                    {t('assign.classroom', 'Salón')}: {classKey}
                  </Text>
                  <View style={styles.classBadge}>
                    <Text style={styles.classBadgeText}>
                      {items.length} {t('assign.classesCount', 'clases')}
                    </Text>
                  </View>
                </View>

                <View style={styles.accordionHeaderRight}>
                  {isExpanded ? (
                    <ChevronUp size={20} color={Colors.text.muted} />
                  ) : (
                    <ChevronDown size={20} color={Colors.text.muted} />
                  )}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.accordionContent}>
                  {sortedDays.map(day => {
                    const daySlots = itemsByDay[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
                    return (
                      <View key={day} style={styles.dayGroup}>
                        {/* Cabecera del día única por sección */}
                        <View style={styles.dayHeader}>
                          <Text style={styles.dayTitleText}>{getDayName(day)}</Text>
                          <View style={styles.dayDividerLine} />
                        </View>

                        {/* Listado de clases del día con diseño tomado de referencia */}
                        {daySlots.map((slot, sIdx) => (
                          <View key={sIdx} style={styles.slotCard}>
                            {/* Columna de Horas: Inicio en grande/bold, Fin abajo suave */}
                            <View style={styles.timeCol}>
                              <Text style={styles.startTimeText}>{formatTime(slot.start_time)}</Text>
                              <Text style={styles.endTimeText}>{formatTime(slot.end_time)}</Text>
                            </View>

                            {/* Franja vertical de separación (gris en ambos modos como se solicitó) */}
                            <View style={styles.verticalGrayStrip} />

                            {/* Detalles: Clase en grande y profesor abajo */}
                            <View style={styles.slotDetails}>
                              <Text style={styles.subjectTitle} numberOfLines={1}>
                                {slot.subject_name}
                              </Text>
                              <View style={styles.teacherRow}>
                                <User size={13} color={Colors.text.muted} style={{ marginRight: 4 }} />
                                <Text style={styles.teacherName} numberOfLines={1}>
                                  {slot.teacher_name}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('assign.title', 'Generador de Horarios')}
        subtitle={t('assign.subtitle', 'Genera y asigna automáticamente horarios de clases')}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {checkingSchedule ? (
          <View style={styles.checkingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : hasExistingSchedule ? (
          /* CARD EN NEGRO MATE CUANDO YA HAY HORARIO EXISTENTE */
          <View style={styles.matteCard}>
            {/* Espacio para imagen centrada arriba */}
            <View style={styles.matteImageSlot}>
              {EXISTING_SCHEDULE_CARD_IMAGE ? (
                <Image 
                  source={EXISTING_SCHEDULE_CARD_IMAGE} 
                  style={styles.matteCustomImage} 
                  resizeMode="contain" 
                />
              ) : (
                <View style={styles.matteIconBadge}>
                  <Calendar size={38} color="#E4E4E7" />
                </View>
              )}
            </View>

            <Text style={styles.matteCardTitle}>
              {t('assign.existingScheduleTitle', 'Propuesta de Horario Generada')}
            </Text>
            <Text style={styles.matteCardDesc}>
              {t('assign.existingScheduleDesc', 'Ya se ha generado una propuesta de horario para este nivel. Para crear una nueva distribución, primero debes eliminar el horario actual.')}
            </Text>

            {/* Botón en negro mate para eliminar horario */}
            <TouchableOpacity 
              style={styles.matteDeleteBtn}
              onPress={() => setDeleteModalVisible(true)}
              disabled={deleting}
              activeOpacity={0.8}
            >
              <Trash2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.matteDeleteBtnText}>
                {t('assign.deleteCurrentSchedule', 'Eliminar Horario Actual')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* CARD DE GENERACIÓN AUTOMÁTICA (SOLO SI NO HAY HORARIO) */
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('assign.autoGeneration', 'Generación Automática')}</Text>
            <Text style={styles.description}>
              {t('assign.autoGenerationDesc', 'El sistema creará una propuesta de horario distribuyendo las materias y profesores disponibles para tu nivel, respetando las horas semanales por materia y evitando choques de horario.')}
            </Text>
            
            <TouchableOpacity 
              style={styles.generateBtn} 
              onPress={generateProposal}
              disabled={loading || applying || deleting}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <RefreshCw size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.generateBtnText}>
                    {proposal.length > 0 ? t('assign.generateNewProposal', 'Generar Nueva Propuesta') : t('assign.generateProposal', 'Generar Propuesta')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {proposal.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('assign.proposalGenerated', 'Propuesta Generada')}</Text>
            <Text style={styles.description}>
              {t('assign.proposalGeneratedDesc', 'Revisa la propuesta de horario por salón. Si estás de acuerdo, guárdala para aplicarla.')}
            </Text>

            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={applySchedule}
              disabled={applying}
              activeOpacity={0.8}
            >
              {applying ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Check size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.applyBtnText}>{t('assign.approveAndApply', 'Aprobar y Aplicar Horario')}</Text>
                </>
              )}
            </TouchableOpacity>

            {renderProposal()}
          </View>
        )}
      </ScrollView>

      {/* Modal de Advertencia para Borrar Horario */}
      <StatusModal
        visible={deleteModalVisible}
        type="warning"
        image={DELETE_WARNING_MODAL_IMAGE}
        title={t('assign.deleteConfirmTitle', '¿Eliminar Horario?')}
        message={t('assign.deleteConfirmDesc', 'Esta acción borrará permanentemente la distribución de horarios actual para este nivel. Podrás generar una nueva propuesta.')}
        confirmText={t('common.delete', 'Eliminar')}
        cancelText={t('common.cancel', 'Cancelar')}
        onConfirm={deleteExistingSchedule}
        confirmLoading={deleting}
        isDestructive={true}
        onClose={() => setDeleteModalVisible(false)}
      />

      {/* Modal de Confirmación de Éxito (Basado en la Referencia) */}
      <StatusModal
        visible={successModalVisible}
        type="success"
        image={SUCCESS_MODAL_IMAGE}
        title={successModalConfig.title}
        message={successModalConfig.message}
        buttonText={t('common.done', 'Listo')}
        onClose={() => setSuccessModalVisible(false)}
      />
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },
  content: { 
    flex: 1 
  },
  scrollContent: { 
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    ...Shadows.card,
  },
  cardTitle: { 
    fontSize: Typography.size.lg, 
    fontWeight: 'bold', 
    color: Colors.primary, 
    marginBottom: Spacing.sm 
  },
  description: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: Typography.size.md,
    fontWeight: 'bold',
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: Typography.size.md,
    fontWeight: 'bold',
  },
  proposalContainer: {
    marginTop: Spacing.sm,
  },
  accordionActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: 2,
  },
  classroomsCountText: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  toggleAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toggleAllBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  accordionCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accordionClassTitle: {
    fontSize: Typography.size.md,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  classBadge: {
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: Spacing.sm,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  accordionHeaderRight: {
    marginLeft: Spacing.sm,
  },
  accordionContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  dayGroup: {
    marginTop: Spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dayTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dayDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0',
    marginLeft: Spacing.sm,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
    borderRadius: BorderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : '#EEF2F6',
  },
  timeCol: {
    width: 80,
    justifyContent: 'center',
  },
  startTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  endTimeText: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 2,
  },
  verticalGrayStrip: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: theme === 'dark' ? '#52525B' : '#CBD5E1',
    marginHorizontal: 10,
  },
  slotDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  teacherName: {
    fontSize: 12,
    color: Colors.text.secondary,
    flex: 1,
  },
  checkingContainer: {
    paddingVertical: Spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matteCard: {
    backgroundColor: '#18181B', // Negro mate
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  matteImageSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  matteCustomImage: {
    width: 88,
    height: 88,
  },
  matteIconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  matteCardTitle: {
    fontSize: Typography.size.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  matteCardDesc: {
    fontSize: Typography.size.sm,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  matteDeleteBtn: {
    backgroundColor: '#27272A', // Botón en negro mate
    borderWidth: 1,
    borderColor: '#3F3F46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    width: '100%',
  },
  matteDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: Typography.size.md,
    fontWeight: 'bold',
  },
});

