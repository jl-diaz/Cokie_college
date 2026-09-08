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
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';
import BottomModal from '../src/components/BottomModal';
import DatePickerSelector from '../src/components/DatePickerSelector';

export default function AcademicPeriodsScreen() {
  const { t, i18n } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { showAlert, showConfirm } = useAlert();
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Crear / Editar
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [periodNumber, setPeriodNumber] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/academic-periods');
      const data = Array.isArray(res.data) ? res.data : [];
      setPeriods(data.sort((a, b) => a.period_number - b.period_number));
    } catch (error) {
      console.error('Error fetching academic periods:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudieron cargar los periodos académicos'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPeriods();
  };

  // Determinar el periodo activo según la fecha actual
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const activePeriod = useMemo(() => {
    return periods.find(p => todayStr >= p.start_date && todayStr <= p.end_date);
  }, [periods, todayStr]);

  // Formato de fecha localizado para tarjetas
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        const isEs = (i18n.language || 'es').startsWith('es');
        return d.toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  // Cálculo de duración en días y semanas
  const calculateDuration = (start, end) => {
    if (!start || !end) return { days: 0, weeks: 0 };
    try {
      const s = new Date(start + 'T12:00:00');
      const e = new Date(end + 'T12:00:00');
      const diffMs = e.getTime() - s.getTime();
      const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
      const weeks = (days / 7).toFixed(1);
      return { days, weeks };
    } catch (err) {
      return { days: 0, weeks: 0 };
    }
  };

  // Validación de fechas en vivo para el formulario modal
  const validationState = useMemo(() => {
    if (!startDate || !endDate) {
      return { isValid: false, reason: null, message: '' };
    }

    // Regla 1: Fin no puede ser antes de inicio
    if (endDate < startDate) {
      return {
        isValid: false,
        reason: 'end_before_start',
        message: t('academicPeriods.validationEndBeforeStart', 'La fecha de fin no puede ser anterior a la fecha de inicio.')
      };
    }

    // Regla 2: 2 periodos no pueden coincidir / solaparse
    const conflict = periods.find(p => {
      // Ignorar el periodo que se está editando
      if (editingPeriod && p.period_number === editingPeriod.period_number) {
        return false;
      }
      // Condición de solapamiento entre intervalos cerrados:
      // startDate <= p.end_date && endDate >= p.start_date
      return startDate <= p.end_date && endDate >= p.start_date;
    });

    if (conflict) {
      return {
        isValid: false,
        reason: 'overlap',
        message: t('academicPeriods.validationOverlap', {
          conflict: conflict.period_number,
          start: conflict.start_date,
          end: conflict.end_date,
          defaultValue: `Las fechas seleccionadas coinciden o se solapan con el Periodo ${conflict.period_number} (${conflict.start_date} al ${conflict.end_date}). Dos periodos no pueden coincidir.`
        })
      };
    }

    return { isValid: true, reason: null, message: '' };
  }, [startDate, endDate, periods, editingPeriod, t]);

  const handleOpenCreateModal = () => {
    setEditingPeriod(null);
    // Sugerir siguiente número de periodo
    const maxPeriodNum = periods.reduce((max, p) => Math.max(max, p.period_number || 0), 0);
    setPeriodNumber(maxPeriodNum + 1);

    // Sugerir fecha de inicio contigua al último periodo si existe
    let suggestedStart = todayStr;
    if (periods.length > 0) {
      const lastPeriod = periods[periods.length - 1];
      if (lastPeriod.end_date) {
        try {
          const lastEnd = new Date(lastPeriod.end_date + 'T12:00:00');
          lastEnd.setDate(lastEnd.getDate() + 1);
          const y = lastEnd.getFullYear();
          const m = String(lastEnd.getMonth() + 1).padStart(2, '0');
          const d = String(lastEnd.getDate()).padStart(2, '0');
          suggestedStart = `${y}-${m}-${d}`;
        } catch (e) {}
      }
    }

    setStartDate(suggestedStart);
    // Sugerir fecha fin a 2 meses
    try {
      const s = new Date(suggestedStart + 'T12:00:00');
      s.setMonth(s.getMonth() + 2);
      const y = s.getFullYear();
      const m = String(s.getMonth() + 1).padStart(2, '0');
      const d = String(s.getDate()).padStart(2, '0');
      setEndDate(`${y}-${m}-${d}`);
    } catch (e) {
      setEndDate(suggestedStart);
    }

    setModalVisible(true);
  };

  const handleOpenEditModal = (period) => {
    setEditingPeriod(period);
    setPeriodNumber(period.period_number);
    setStartDate(period.start_date);
    setEndDate(period.end_date);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Atención'),
        message: 'Por favor completa las fechas de inicio y fin del periodo'
      });
      return;
    }

    if (!validationState.isValid) {
      showAlert({
        type: 'warning',
        title: 'Fechas Inválidas',
        message: validationState.message
      });
      return;
    }

    setSaving(true);
    try {
      if (editingPeriod) {
        await api.put(`/admin/academic-periods/${editingPeriod.period_number}`, {
          start_date: startDate,
          end_date: endDate
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('academicPeriods.saveSuccess', 'Periodo guardado correctamente')
        });
      } else {
        await api.post('/admin/academic-periods', {
          period_number: periodNumber,
          start_date: startDate,
          end_date: endDate
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('academicPeriods.saveSuccess', 'Periodo creado exitosamente')
        });
      }
      setModalVisible(false);
      fetchPeriods();
    } catch (error) {
      console.error('Error saving period:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudo guardar el periodo'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (period) => {
    showConfirm({
      type: 'danger',
      title: t('academicPeriods.deleteTitle', 'Eliminar Periodo'),
      message: t('academicPeriods.deleteConfirm', { number: period.period_number }),
      confirmText: t('dashboard.delete', 'Eliminar'),
      cancelText: t('dashboard.cancel', 'Cancelar'),
      onConfirm: async () => {
        try {
          await api.delete(`/admin/academic-periods/${period.period_number}`);
          showAlert({
            type: 'success',
            title: t('dashboard.success', '¡Eliminado!'),
            message: t('academicPeriods.deleteSuccess', 'Periodo eliminado correctamente')
          });
          fetchPeriods();
        } catch (error) {
          showAlert({
            type: 'error',
            title: t('dashboard.error', 'Error'),
            message: error.response?.data?.error || 'No se pudo eliminar el periodo'
          });
        }
      }
    });
  };

  // Renderizar cada periodo
  const renderPeriodCard = ({ item }) => {
    const isCurrent = todayStr >= item.start_date && todayStr <= item.end_date;
    const isUpcoming = todayStr < item.start_date;
    const isFinished = todayStr > item.end_date;

    const statusBadgeColor = isCurrent
      ? '#10B981'
      : isUpcoming
        ? '#3B82F6'
        : '#64748B';

    const statusText = isCurrent
      ? t('academicPeriods.statusActive', 'En curso')
      : isUpcoming
        ? t('academicPeriods.statusUpcoming', 'Próximo')
        : t('academicPeriods.statusFinished', 'Finalizado');

    const duration = calculateDuration(item.start_date, item.end_date);

    return (
      <View style={[styles.card, isCurrent && styles.cardActive]}>
        <View style={styles.cardHeader}>
          <View style={styles.periodNumberRow}>
            <View style={[styles.numberBadge, { backgroundColor: isCurrent ? '#10B981' : Colors.primary }]}>
              <Text style={styles.numberBadgeText}>
                {item.period_number}
              </Text>
            </View>
            <Text style={styles.periodTitle}>
              {t('academicPeriods.periodCardTitle', { number: item.period_number })}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadgeColor + '18' }]}>
            <Text style={[styles.statusBadgeText, { color: statusBadgeColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Rango de fechas */}
        <View style={styles.dateRangeBox}>
          <View style={styles.dateCol}>
            <Text style={styles.dateColLabel}>
              {t('academicPeriods.startDate', 'Fecha de Inicio')}
            </Text>
            <Text style={styles.dateColValue}>
              {formatDisplayDate(item.start_date)}
            </Text>
            <Text style={styles.dateColRaw}>{item.start_date}</Text>
          </View>

          <View style={styles.arrowCol}>
            <ArrowRight size={18} color={Colors.text.muted} />
          </View>

          <View style={styles.dateCol}>
            <Text style={styles.dateColLabel}>
              {t('academicPeriods.endDate', 'Fecha de Fin')}
            </Text>
            <Text style={styles.dateColValue}>
              {formatDisplayDate(item.end_date)}
            </Text>
            <Text style={styles.dateColRaw}>{item.end_date}</Text>
          </View>
        </View>

        {/* Footer de la tarjeta con duración y acciones */}
        <View style={styles.cardFooter}>
          <View style={styles.durationInfo}>
            <Clock size={14} color={Colors.text.muted} style={{ marginRight: 6 }} />
            <Text style={styles.durationText}>
              {t('academicPeriods.duration', { days: duration.days, weeks: duration.weeks })}
            </Text>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => handleOpenEditModal(item)}
              style={styles.actionBtn}
              activeOpacity={0.7}
            >
              <Edit2 size={16} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDelete(item)}
              style={styles.actionBtn}
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
        title={t('titles.academicPeriods', 'Periodos Académicos')}
        subtitle={t('titles.academicPeriodsSubtitle', 'Gestión de fechas de inicio y fin de periodos')}
        showBack={true}
      />

      {/* Tarjeta Informativa de Normativa de Periodos */}
      <View style={styles.noticeCard}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <Info size={18} color={Colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.noticeTitle}>
              {t('academicPeriods.calendarView', 'Calendario Escolar')}
            </Text>
            <Text style={styles.noticeText}>
              {t('academicPeriods.guidelinesNotice', 'Configura los intervalos lectivos. Cada periodo debe ser cronológicamente consecutivo y sin solapamiento de fechas con ningún otro periodo escolar.')}
            </Text>
            {activePeriod && (
              <View style={styles.activePeriodPill}>
                <CheckCircle size={13} color="#10B981" style={{ marginRight: 5 }} />
                <Text style={styles.activePeriodPillText}>
                  Periodo actual en curso: Periodo {activePeriod.period_number} ({formatDisplayDate(activePeriod.start_date)} - {formatDisplayDate(activePeriod.end_date)})
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Botón de Agregar Periodo */}
      <View style={styles.topActionsRow}>
        <Text style={styles.sectionHeading}>
          Periodos Registrados ({periods.length})
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>
            {t('academicPeriods.addPeriod', 'Nuevo Periodo')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Listado de Periodos */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={periods}
          keyExtractor={(item) => String(item.period_number)}
          renderItem={renderPeriodCard}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CalendarIcon size={48} color={Colors.text.muted} style={{ opacity: 0.5, marginBottom: 12 }} />
              <Text style={styles.emptyText}>
                {t('academicPeriods.emptyList', 'No hay periodos académicos registrados.')}
              </Text>
            </View>
          }
        />
      )}

      {/* MODAL: Crear / Editar Periodo con DatePickerSelector y Validaciones en Tiempo Real */}
      <BottomModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {editingPeriod 
                  ? t('academicPeriods.editPeriod', { number: editingPeriod.period_number })
                  : t('academicPeriods.addPeriod', 'Nuevo Periodo')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {t('academicPeriods.guidelinesNotice', 'El periodo no puede solaparse con ningún otro.')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <X size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Campo de Número de Periodo (editable solo al crear) */}
          {!editingPeriod && (
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.inputLabel}>
                {t('academicPeriods.periodNumber', 'Número de Periodo *')}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('academicPeriods.periodNumberPlaceholder', 'Ej. 1, 2, 3...')}
                placeholderTextColor={Colors.text.muted}
                keyboardType="numeric"
                value={String(periodNumber)}
                onChangeText={(text) => {
                  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                  setPeriodNumber(isNaN(num) ? '' : num);
                }}
              />
            </View>
          )}

          {/* Selector Bonito de Fecha de Inicio Multiplataforma */}
          <DatePickerSelector
            label={t('academicPeriods.startDate', 'Fecha de Inicio *')}
            value={startDate}
            onChange={(d) => setStartDate(d)}
            placeholder={t('academicPeriods.selectStartDate', 'Seleccionar fecha de inicio')}
          />

          {/* Selector Bonito de Fecha de Fin Multiplataforma */}
          <DatePickerSelector
            label={t('academicPeriods.endDate', 'Fecha de Fin *')}
            value={endDate}
            onChange={(d) => setEndDate(d)}
            placeholder={t('academicPeriods.selectEndDate', 'Seleccionar fecha de fin')}
          />

          {/* Banner de Validación en Tiempo Real */}
          {!validationState.isValid && validationState.message ? (
            <View style={styles.validationErrorBanner}>
              <ShieldAlert size={18} color="#EF4444" style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={styles.validationErrorText}>
                {validationState.message}
              </Text>
            </View>
          ) : null}

          {/* Resumen de duración calculada si es válido */}
          {validationState.isValid && startDate && endDate ? (
            <View style={styles.validSummaryBox}>
              <CheckCircle size={16} color="#10B981" style={{ marginRight: 6 }} />
              <Text style={styles.validSummaryText}>
                Rango válido: {calculateDuration(startDate, endDate).days} días de clases lectivas (sin colisiones).
              </Text>
            </View>
          ) : null}

          {/* Botón de Guardar (deshabilitado si hay errores de validación) */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!validationState.isValid || saving) && styles.submitBtnDisabled
            ]}
            onPress={handleSave}
            disabled={!validationState.isValid || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitBtnText}>
                {editingPeriod 
                  ? t('academicPeriods.save', 'Guardar Periodo') 
                  : t('academicPeriods.create', 'Crear Periodo')}
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
    noticeCard: {
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
      padding: 14,
      borderRadius: BorderRadius.lg,
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor,
      ...Shadows.card,
    },
    noticeTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: textColor,
      marginBottom: 3,
    },
    noticeText: {
      fontSize: 12,
      color: Colors.text.secondary,
      lineHeight: 16,
    },
    activePeriodPill: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      backgroundColor: '#10B98114',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      alignSelf: 'flex-start',
    },
    activePeriodPillText: {
      fontSize: 11,
      color: '#10B981',
      fontWeight: '700',
    },
    topActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      marginVertical: Spacing.md,
    },
    sectionHeading: {
      fontSize: 14,
      fontWeight: '700',
      color: Colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.primary,
      paddingHorizontal: 14,
      height: 40,
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
      padding: 16,
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor,
      ...Shadows.card,
    },
    cardActive: {
      borderColor: '#10B981',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    periodNumberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    numberBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberBadgeText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    periodTitle: {
      fontSize: 16,
      fontWeight: '800',
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
    dateRangeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
      borderRadius: BorderRadius.md,
      padding: 12,
      borderWidth: 1,
      borderColor,
      marginBottom: 12,
    },
    dateCol: {
      flex: 1,
    },
    dateColLabel: {
      fontSize: 11,
      color: Colors.text.muted,
      fontWeight: '600',
      marginBottom: 2,
      textTransform: 'uppercase',
    },
    dateColValue: {
      fontSize: 14,
      fontWeight: '700',
      color: textColor,
    },
    dateColRaw: {
      fontSize: 10,
      color: Colors.text.muted,
      marginTop: 1,
    },
    arrowCol: {
      paddingHorizontal: 10,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: borderColor,
    },
    durationInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    durationText: {
      fontSize: 12,
      color: Colors.text.secondary,
      fontWeight: '500',
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      padding: 8,
      borderRadius: BorderRadius.sm,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
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
    // Modal
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
      fontSize: 12,
      color: Colors.text.muted,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
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
    validationErrorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#FEF2F2',
      borderRadius: BorderRadius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: '#FCA5A5',
      marginBottom: 14,
    },
    validationErrorText: {
      fontSize: 12,
      color: '#B91C1C',
      flex: 1,
      lineHeight: 16,
      fontWeight: '600',
    },
    validSummaryBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F0FDF4',
      borderRadius: BorderRadius.md,
      padding: 10,
      borderWidth: 1,
      borderColor: '#86EFAC',
      marginBottom: 14,
    },
    validSummaryText: {
      fontSize: 12,
      color: '#15803D',
      fontWeight: '600',
      flex: 1,
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
    submitBtnDisabled: {
      opacity: 0.45,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });
};
