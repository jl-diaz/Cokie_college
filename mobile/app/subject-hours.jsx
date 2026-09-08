import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import api from '../src/utils/api';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Clock, 
  BookOpen, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  Minus
} from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';

// Capacidad máxima de clase semanal:
// 25h jornada semanal (07:00-12:00 L-V) - 5h de recesos (1h diaria) = 20h netas de clase (40 bloques de 30 min)
const MAX_WEEKLY_HOURS = 20;
const TOTAL_BLOCKS = 40;

export default function SubjectHoursScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { showAlert, showConfirm } = useAlert();
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Modal para Crear / Editar Materia
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formName, setFormName] = useState('');
  const [formHours, setFormHours] = useState(4);
  const [savingForm, setSavingForm] = useState(false);

  // Modal selector rápido de horas para una materia
  const [hoursModalVisible, setHoursModalVisible] = useState(false);
  const [selectedSubjectForHours, setSelectedSubjectForHours] = useState(null);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/subjects');
      setSubjects(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error loading subjects:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudieron cargar las materias'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubjects();
  };

  // Cálculo de horas totales asignadas
  const totalAllocatedHours = useMemo(() => {
    return subjects.reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
  }, [subjects]);

  const totalAllocatedBlocks = totalAllocatedHours * 2;
  const remainingHours = Math.max(0, MAX_WEEKLY_HOURS - totalAllocatedHours);
  const isAtFullCapacity = totalAllocatedHours === MAX_WEEKLY_HOURS;
  const isOverCapacity = totalAllocatedHours > MAX_WEEKLY_HOURS;

  // Filtrado por buscador
  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return subjects;
    const term = searchTerm.toLowerCase();
    return subjects.filter(s => s.name?.toLowerCase().includes(term));
  }, [subjects, searchTerm]);

  // Modificar horas usando stepper rápido [-] / [+]
  const handleQuickAdjustHours = async (subject, delta) => {
    const currentHours = subject.weekly_hours || 1;
    const newHours = currentHours + delta;

    if (newHours < 1) return;

    if (delta > 0) {
      const otherHours = subjects
        .filter(s => s.id !== subject.id)
        .reduce((sum, s) => sum + (s.weekly_hours || 0), 0);

      if (otherHours + newHours > MAX_WEEKLY_HOURS) {
        showAlert({
          type: 'warning',
          title: t('subjectHours.limitAlertTitle', 'Límite de Capacidad Semanal'),
          message: t('subjectHours.limitAlertMessage', 'La jornada escolar dispone de 20 horas de clase netas a la semana (25h totales - 5h de receso). Para asignar más horas a esta materia, primero reduce horas en otra materia.')
        });
        return;
      }
    }

    // Actualización optimista en UI
    setUpdatingId(subject.id);
    const prevSubjects = [...subjects];
    setSubjects(prev =>
      prev.map(s => (s.id === subject.id ? { ...s, weekly_hours: newHours } : s))
    );

    try {
      await api.put(`/admin/subjects/${subject.id}`, { weekly_hours: newHours });
    } catch (error) {
      // Revertir en caso de error
      setSubjects(prevSubjects);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudieron actualizar las horas'
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Abrir selector modal de horas para una materia
  const handleOpenHoursModal = (subject) => {
    setSelectedSubjectForHours(subject);
    setHoursModalVisible(true);
  };

  const handleSelectHoursFromModal = async (hours) => {
    if (!selectedSubjectForHours) return;

    const otherHours = subjects
      .filter(s => s.id !== selectedSubjectForHours.id)
      .reduce((sum, s) => sum + (s.weekly_hours || 0), 0);

    if (otherHours + hours > MAX_WEEKLY_HOURS) {
      showAlert({
        type: 'warning',
        title: t('subjectHours.limitAlertTitle', 'Límite de Capacidad Semanal'),
        message: t('subjectHours.limitAlertMessage', 'La jornada escolar dispone de 20 horas de clase netas a la semana (25h totales - 5h de receso).')
      });
      return;
    }

    setHoursModalVisible(false);
    setUpdatingId(selectedSubjectForHours.id);

    const prevSubjects = [...subjects];
    setSubjects(prev =>
      prev.map(s => (s.id === selectedSubjectForHours.id ? { ...s, weekly_hours: hours } : s))
    );

    try {
      await api.put(`/admin/subjects/${selectedSubjectForHours.id}`, { weekly_hours: hours });
      showAlert({
        type: 'success',
        title: t('dashboard.success', '¡Éxito!'),
        message: t('subjectHours.updateSuccess', 'Horas semanales actualizadas correctamente')
      });
    } catch (error) {
      setSubjects(prevSubjects);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudieron actualizar las horas'
      });
    } finally {
      setUpdatingId(null);
      setSelectedSubjectForHours(null);
    }
  };

  // Modal para Crear / Editar Materia
  const handleOpenCreateModal = () => {
    setEditingSubject(null);
    setFormName('');
    const defaultHours = Math.min(4, Math.max(1, remainingHours));
    setFormHours(defaultHours);
    setModalVisible(true);
  };

  const handleOpenEditModal = (subject) => {
    setEditingSubject(subject);
    setFormName(subject.name || '');
    setFormHours(subject.weekly_hours || 4);
    setModalVisible(true);
  };

  const handleSaveForm = async () => {
    if (!formName.trim()) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Atención'),
        message: 'Por favor ingresa el nombre de la materia'
      });
      return;
    }

    const otherHours = editingSubject
      ? subjects.filter(s => s.id !== editingSubject.id).reduce((sum, s) => sum + (s.weekly_hours || 0), 0)
      : totalAllocatedHours;

    if (otherHours + formHours > MAX_WEEKLY_HOURS) {
      showAlert({
        type: 'warning',
        title: t('subjectHours.limitAlertTitle', 'Límite de Capacidad Semanal'),
        message: t('subjectHours.limitAlertMessage', 'La jornada escolar dispone de 20 horas de clase netas a la semana (25h totales - 5h de receso).')
      });
      return;
    }

    setSavingForm(true);
    try {
      if (editingSubject) {
        await api.put(`/admin/subjects/${editingSubject.id}`, {
          name: formName.trim(),
          weekly_hours: formHours
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('subjectHours.updateSuccess', 'Materia actualizada correctamente')
        });
      } else {
        await api.post('/admin/subjects', {
          name: formName.trim(),
          weekly_hours: formHours
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('subjectHours.createSuccess', 'Materia creada exitosamente')
        });
      }
      setModalVisible(false);
      fetchSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudo guardar la materia'
      });
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteSubject = (subject) => {
    showConfirm({
      type: 'danger',
      title: t('subjectHours.deleteTitle', 'Eliminar Materia'),
      message: t('subjectHours.deleteConfirm', { name: subject.name }),
      confirmText: t('dashboard.delete', 'Eliminar'),
      cancelText: t('dashboard.cancel', 'Cancelar'),
      onConfirm: async () => {
        try {
          await api.delete(`/admin/subjects/${subject.id}`);
          showAlert({
            type: 'success',
            title: t('dashboard.success', '¡Eliminada!'),
            message: t('subjectHours.deleteSuccess', 'Materia eliminada correctamente')
          });
          fetchSubjects();
        } catch (error) {
          showAlert({
            type: 'error',
            title: t('dashboard.error', 'Error'),
            message: error.response?.data?.error || 'No se pudo eliminar la materia'
          });
        }
      }
    });
  };

  // Barra de progreso y colores dinámicos
  const progressPercent = Math.min(100, Math.round((totalAllocatedHours / MAX_WEEKLY_HOURS) * 100));
  const progressColor = isOverCapacity 
    ? '#EF4444' 
    : isAtFullCapacity 
      ? '#10B981' 
      : Colors.primary;

  const renderSubjectCard = ({ item }) => {
    const isUpdating = updatingId === item.id;
    const hours = item.weekly_hours || 1;
    const blocks = hours * 2;
    const canIncrease = totalAllocatedHours < MAX_WEEKLY_HOURS;

    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <View style={[styles.subjectIconWrapper, { backgroundColor: Colors.primary + '14' }]}>
            <BookOpen size={20} color={Colors.primary} />
          </View>
          <View style={styles.subjectInfo}>
            <Text style={styles.subjectName}>{item.name}</Text>
            <View style={styles.subDetailRow}>
              <Text style={styles.blocksText}>
                {t('subjectHours.blocksCount', { count: blocks })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          {/* Selector de Horas con Stepper Bonito */}
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={hours <= 1 || isUpdating}
              onPress={() => handleQuickAdjustHours(item, -1)}
              style={[styles.stepperBtn, hours <= 1 && styles.stepperBtnDisabled]}
            >
              <Minus size={15} color={hours <= 1 ? Colors.text.muted : Colors.text.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={isUpdating}
              onPress={() => handleOpenHoursModal(item)}
              style={styles.hoursBadge}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.hoursBadgeText}>
                  {hours}h
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!canIncrease || isUpdating}
              onPress={() => handleQuickAdjustHours(item, 1)}
              style={[styles.stepperBtn, !canIncrease && styles.stepperBtnDisabled]}
            >
              <Plus size={15} color={!canIncrease ? Colors.text.muted : Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Botones de acción (Editar nombre / Eliminar) */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              onPress={() => handleOpenEditModal(item)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Edit2 size={16} color={Colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteSubject(item)}
              style={styles.iconBtn}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('titles.subjectHours', 'Horas de Materias')}
        subtitle={t('titles.subjectHoursSubtitle', 'Control de horas semanales para el generador de horarios')}
      />

      {/* Tarjeta de Capacidad Semanal considerando Recesos */}
      <View style={styles.capacityCard}>
        <View style={styles.capacityHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color={progressColor} />
            <Text style={styles.capacityTitle}>
              {t('subjectHours.capacityTitle', 'Capacidad Semanal de Clases')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: progressColor + '18' }]}>
            <Text style={[styles.statusBadgeText, { color: progressColor }]}>
              {totalAllocatedHours} / {MAX_WEEKLY_HOURS}h
            </Text>
          </View>
        </View>

        {/* Barra de progreso interactiva */}
        <View style={styles.progressBarTrack}>
          <View 
            style={[
              styles.progressBarFill, 
              { 
                width: `${progressPercent}%`, 
                backgroundColor: progressColor 
              }
            ]} 
          />
        </View>

        <View style={styles.capacityDetailsRow}>
          <Text style={styles.capacityDetailText}>
            {t('subjectHours.capacityDetail', {
              used: totalAllocatedHours,
              total: MAX_WEEKLY_HOURS,
              blocks: totalAllocatedBlocks,
              totalBlocks: TOTAL_BLOCKS
            })}
          </Text>
          <Text style={[styles.remainingHoursText, { color: isAtFullCapacity ? '#10B981' : isOverCapacity ? '#EF4444' : Colors.text.secondary }]}>
            {isAtFullCapacity
              ? t('subjectHours.fullCapacity', '¡Capacidad completa!')
              : isOverCapacity
                ? t('subjectHours.exceededCapacity', { hours: totalAllocatedHours - MAX_WEEKLY_HOURS })
                : t('subjectHours.remainingHours', { hours: remainingHours })}
          </Text>
        </View>

        {/* Explicación de recesos */}
        <View style={styles.recessNotice}>
          <Info size={14} color={Colors.text.muted} style={{ marginTop: 1, marginRight: 6 }} />
          <Text style={styles.recessNoticeText}>
            {t('subjectHours.recessExplanation', 'Jornada de 25h semanales (07:00-12:00) menos 5h de receso (1h diaria) = 20h netas de clase.')}
          </Text>
        </View>
      </View>

      {/* Controles de Búsqueda y Agregar Materia */}
      <View style={styles.controlsRow}>
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.text.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('subjectHours.searchPlaceholder', 'Buscar materia...')}
            placeholderTextColor={Colors.text.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <X size={16} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>
            {t('subjectHours.addSubject', 'Nueva Materia')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listado de Materias */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredSubjects}
          keyExtractor={(item) => item.id}
          renderItem={renderSubjectCard}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={Colors.text.muted} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={styles.emptyText}>
                {t('subjectHours.emptyList', 'No se encontraron materias registradas')}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL 1: Selector Bonito de Horas por Chips */}
      <BottomModal
        visible={hoursModalVisible}
        onClose={() => setHoursModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {t('subjectHours.selectHours', 'Seleccionar Horas Semanales')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedSubjectForHours?.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setHoursModalVisible(false)} style={styles.closeBtn}>
              <X size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.quickSelectLabel}>
            {t('subjectHours.quickSelect', 'Selección Rápida:')}
          </Text>

          {/* Chips de horas (1h a 8h) */}
          <View style={styles.chipsGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => {
              const currentSubHours = selectedSubjectForHours?.weekly_hours || 0;
              const otherHours = subjects
                .filter(s => s.id !== selectedSubjectForHours?.id)
                .reduce((sum, s) => sum + (s.weekly_hours || 0), 0);
              const willExceed = otherHours + h > MAX_WEEKLY_HOURS;
              const isSelected = currentSubHours === h;

              return (
                <TouchableOpacity
                  key={h}
                  activeOpacity={0.7}
                  disabled={willExceed}
                  onPress={() => handleSelectHoursFromModal(h)}
                  style={[
                    styles.hourChip,
                    isSelected && styles.hourChipSelected,
                    willExceed && styles.hourChipDisabled
                  ]}
                >
                  <Text
                    style={[
                      styles.hourChipText,
                      isSelected && styles.hourChipTextSelected,
                      willExceed && styles.hourChipTextDisabled
                    ]}
                  >
                    {h} h/sem
                  </Text>
                  <Text
                    style={[
                      styles.hourChipSubText,
                      isSelected && styles.hourChipSubTextSelected,
                      willExceed && styles.hourChipTextDisabled
                    ]}
                  >
                    {h * 2} bloques
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.modalInfoBox}>
            <Info size={14} color={Colors.primary} style={{ marginTop: 2, marginRight: 6 }} />
            <Text style={styles.modalInfoText}>
              {t('subjectHours.hoursHelp', 'Cada hora equivale a 2 bloques de 30 minutos en el generador de horarios.')}
            </Text>
          </View>
        </View>
      </BottomModal>

      {/* MODAL 2: Crear / Editar Nombre y Horas de Materia */}
      <BottomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSubject 
                ? t('subjectHours.editSubject', 'Editar Materia') 
                : t('subjectHours.addSubject', 'Nueva Materia')}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <X size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>
            {t('subjectHours.subjectName', 'Nombre de la Materia *')}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder={t('subjectHours.subjectNamePlaceholder', 'Ej. Robótica')}
            placeholderTextColor={Colors.text.muted}
            value={formName}
            onChangeText={setFormName}
          />

          <Text style={[styles.inputLabel, { marginTop: 14 }]}>
            {t('subjectHours.hoursLabel', 'Horas Semanales *')}
          </Text>

          {/* Stepper selector en el formulario */}
          <View style={styles.formStepperRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={formHours <= 1}
              onPress={() => setFormHours(prev => Math.max(1, prev - 1))}
              style={[styles.formStepperBtn, formHours <= 1 && styles.stepperBtnDisabled]}
            >
              <Minus size={18} color={formHours <= 1 ? Colors.text.muted : Colors.text.primary} />
            </TouchableOpacity>

            <View style={styles.formHoursDisplay}>
              <Text style={styles.formHoursDisplayText}>{formHours} horas/semana</Text>
              <Text style={styles.formBlocksDisplayText}>({formHours * 2} bloques de 30 min)</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const otherHours = editingSubject
                  ? subjects.filter(s => s.id !== editingSubject.id).reduce((sum, s) => sum + (s.weekly_hours || 0), 0)
                  : totalAllocatedHours;
                if (otherHours + formHours + 1 > MAX_WEEKLY_HOURS) {
                  showAlert({
                    type: 'warning',
                    title: t('subjectHours.limitAlertTitle', 'Límite de Capacidad Semanal'),
                    message: t('subjectHours.limitAlertMessage', 'La jornada escolar dispone de 20 horas de clase netas a la semana.')
                  });
                  return;
                }
                setFormHours(prev => prev + 1);
              }}
              style={styles.formStepperBtn}
            >
              <Plus size={18} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, savingForm && { opacity: 0.7 }]}
            onPress={handleSaveForm}
            disabled={savingForm}
            activeOpacity={0.8}
          >
            {savingForm ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingSubject 
                  ? t('subjectHours.save', 'Guardar Cambios') 
                  : t('subjectHours.create', 'Crear Materia')}
              </Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </BottomModal>
    </View>
  );
}

const createStyles = (Colors, theme) => {
  const isDark = theme === 'dark';
  const cardBg = Colors.card;
  const textColor = Colors.text.primary;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    capacityCard: {
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
      padding: 16,
      borderRadius: BorderRadius.lg,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor,
      ...Shadows.card,
    },
    capacityHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    capacityTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: textColor,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    progressBarTrack: {
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
      overflow: 'hidden',
      marginBottom: 8,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    capacityDetailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    capacityDetailText: {
      fontSize: 12,
      color: Colors.text.secondary,
      fontWeight: '500',
    },
    remainingHoursText: {
      fontSize: 12,
      fontWeight: '700',
    },
    recessNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: borderColor,
    },
    recessNoticeText: {
      fontSize: 11,
      color: Colors.text.muted,
      flex: 1,
      lineHeight: 15,
    },
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      marginVertical: Spacing.sm,
      gap: 10,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 12,
      height: 44,
      ...Shadows.card,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: textColor,
      paddingVertical: 0,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.primary,
      paddingHorizontal: 14,
      height: 44,
      borderRadius: BorderRadius.md,
      gap: 6,
      ...Shadows.card,
    },
    addBtnText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: cardBg,
      borderRadius: BorderRadius.lg,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      ...Shadows.card,
    },
    cardLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    subjectIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    subjectInfo: {
      flex: 1,
    },
    subjectName: {
      fontSize: 15,
      fontWeight: '700',
      color: textColor,
      marginBottom: 2,
    },
    subDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    blocksText: {
      fontSize: 12,
      color: Colors.text.muted,
      fontWeight: '500',
    },
    cardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    stepperContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
      borderRadius: BorderRadius.full,
      padding: 3,
      borderWidth: 1,
      borderColor,
    },
    stepperBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: cardBg,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.card,
    },
    stepperBtnDisabled: {
      opacity: 0.35,
    },
    hoursBadge: {
      paddingHorizontal: 8,
      minWidth: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hoursBadgeText: {
      fontSize: 13,
      fontWeight: '800',
      color: Colors.primary,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 2,
      gap: 2,
    },
    iconBtn: {
      padding: 6,
    },
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 50,
    },
    emptyText: {
      fontSize: 14,
      color: Colors.text.muted,
      textAlign: 'center',
    },
    // Modal Styles
    modalContent: {
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: textColor,
    },
    modalSubtitle: {
      fontSize: 13,
      color: Colors.text.muted,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    quickSelectLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: textColor,
      marginBottom: 10,
    },
    chipsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    hourChip: {
      width: '23%',
      paddingVertical: 10,
      paddingHorizontal: 6,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
      borderWidth: 1.2,
      borderColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hourChipSelected: {
      backgroundColor: Colors.primary + '18',
      borderColor: Colors.primary,
    },
    hourChipDisabled: {
      opacity: 0.35,
    },
    hourChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: textColor,
    },
    hourChipTextSelected: {
      color: Colors.primary,
    },
    hourChipSubText: {
      fontSize: 10,
      color: Colors.text.muted,
      marginTop: 2,
    },
    hourChipSubTextSelected: {
      color: Colors.primary,
    },
    hourChipTextDisabled: {
      color: Colors.text.muted,
    },
    modalInfoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: Colors.primary + '10',
      borderRadius: BorderRadius.md,
      padding: 10,
    },
    modalInfoText: {
      fontSize: 12,
      color: Colors.primary,
      flex: 1,
      lineHeight: 16,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: textColor,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
      borderWidth: 1.2,
      borderColor,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
      color: textColor,
    },
    formStepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
      borderRadius: BorderRadius.md,
      padding: 10,
      borderWidth: 1.2,
      borderColor,
      marginBottom: 20,
    },
    formStepperBtn: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.md,
      backgroundColor: cardBg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor,
      ...Shadows.card,
    },
    formHoursDisplay: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    formHoursDisplayText: {
      fontSize: 15,
      fontWeight: '700',
      color: textColor,
    },
    formBlocksDisplayText: {
      fontSize: 12,
      color: Colors.text.muted,
      marginTop: 2,
    },
    submitBtn: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.md,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
      ...Shadows.card,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
};
