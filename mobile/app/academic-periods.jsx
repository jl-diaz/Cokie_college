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
  ArrowRight,
  ShieldAlert,
  Sparkles,
  CalendarDays,
  Layers
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
  const isDark = theme === 'dark';

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
  const [activePicker, setActivePicker] = useState(null); // 'start' | 'end' | null

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
        message: error.response?.data?.error || t('academicPeriods.loadError', 'No se pudieron cargar los periodos académicos')
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

  // Determinar la fecha de hoy en formato YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Determinar el periodo activo según la fecha actual
  const activePeriod = useMemo(() => {
    return periods.find(p => todayStr >= p.start_date && todayStr <= p.end_date);
  }, [periods, todayStr]);

  // Próximo periodo más cercano si no hay activo actualmente
  const nextUpcomingPeriod = useMemo(() => {
    if (activePeriod) return null;
    return periods.find(p => p.start_date > todayStr);
  }, [periods, todayStr, activePeriod]);

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

    if (endDate < startDate) {
      return {
        isValid: false,
        reason: 'end_before_start',
        message: t('academicPeriods.validationEndBeforeStart', 'La fecha de fin no puede ser anterior a la fecha de inicio.')
      };
    }

    const conflict = periods.find(p => {
      if (editingPeriod && p.period_number === editingPeriod.period_number) {
        return false;
      }
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
    const maxPeriodNum = periods.reduce((max, p) => Math.max(max, p.period_number || 0), 0);
    setPeriodNumber(maxPeriodNum + 1);

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

    setActivePicker(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (period) => {
    setEditingPeriod(period);
    setPeriodNumber(period.period_number);
    setStartDate(period.start_date);
    setEndDate(period.end_date);
    setActivePicker(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!startDate || !endDate) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Atención'),
        message: t('academicPeriods.fillDatesWarning', 'Por favor completa las fechas de inicio y fin del periodo')
      });
      return;
    }

    if (!validationState.isValid) {
      showAlert({
        type: 'warning',
        title: t('academicPeriods.invalidDates', 'Fechas Inválidas'),
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
      } else {
        await api.post('/admin/academic-periods', {
          period_number: periodNumber,
          start_date: startDate,
          end_date: endDate
        });
      }

      setModalVisible(false);
      setActivePicker(null);
      await fetchPeriods();

      const successMsg = editingPeriod 
        ? t('academicPeriods.saveSuccess', 'Periodo guardado correctamente')
        : t('academicPeriods.saveSuccess', 'Periodo creado exitosamente');

      setTimeout(() => {
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: successMsg
        });
      }, 300);
    } catch (error) {
      console.error('Error saving period:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || t('academicPeriods.saveError', 'No se pudo guardar el periodo')
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
            message: error.response?.data?.error || t('academicPeriods.deleteError', 'No se pudo eliminar el periodo')
          });
        }
      }
    });
  };

  // Renderizar cada periodo en estilo Bento / Minimalista no lineal
  const renderPeriodCard = ({ item }) => {
    const isCurrent = todayStr >= item.start_date && todayStr <= item.end_date;
    const isUpcoming = todayStr < item.start_date;
    const isFinished = todayStr > item.end_date;

    const statusBadgeColor = isCurrent
      ? Colors.primary
      : isUpcoming
        ? '#3B82F6'
        : (isDark ? '#94A3B8' : '#64748B');

    const statusBg = isCurrent
      ? (isDark ? `${Colors.primary}25` : `${Colors.primary}15`)
      : isUpcoming
        ? (isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF')
        : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9');

    const statusText = isCurrent
      ? t('academicPeriods.statusActive', 'En curso')
      : isUpcoming
        ? t('academicPeriods.statusUpcoming', 'Próximo')
        : t('academicPeriods.statusFinished', 'Finalizado');

    const duration = calculateDuration(item.start_date, item.end_date);

    return (
      <View style={[styles.periodCard, isCurrent && styles.periodCardActive]}>
        {/* Header de la Tarjeta */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[
              styles.numberBadge, 
              { backgroundColor: isCurrent ? Colors.primary : (isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9') }
            ]}>
              <Text style={[
                styles.numberBadgeText, 
                { color: isCurrent ? '#FFFFFF' : (isDark ? '#F1F5F9' : Colors.text.primary) }
              ]}>
                {item.period_number}
              </Text>
            </View>
            <View>
              <Text style={styles.periodTitle}>
                {t('academicPeriods.periodCardTitle', { number: item.period_number })}
              </Text>
              <Text style={styles.periodDurationSub}>
                {t('academicPeriods.duration', { days: duration.days, weeks: duration.weeks })}
              </Text>
            </View>
          </View>

          <View style={styles.cardHeaderRight}>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
              {isCurrent && <View style={styles.liveIndicatorDot} />}
              <Text style={[styles.statusPillText, { color: statusBadgeColor }]}>
                {statusText}
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                onPress={() => handleOpenEditModal(item)}
                style={styles.iconBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Edit2 size={15} color={Colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDelete(item)}
                style={[styles.iconBtn, styles.deleteIconBtn]}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Trash2 size={15} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Fila Horizontal de Fechas: Limpia, Minimalista y sin duplicados */}
        <View style={styles.dateTrack}>
          <View style={styles.dateSegment}>
            <Text style={styles.dateTrackLabel}>
              {t('academicPeriods.startDate', 'Fecha de Inicio')}
            </Text>
            <Text style={styles.dateTrackValue}>
              {formatDisplayDate(item.start_date)}
            </Text>
          </View>

          <View style={styles.dateArrowBox}>
            <ArrowRight size={14} color={Colors.text.muted} />
          </View>

          <View style={[styles.dateSegment, { alignItems: 'flex-end' }]}>
            <Text style={styles.dateTrackLabel}>
              {t('academicPeriods.endDate', 'Fecha de Fin')}
            </Text>
            <Text style={styles.dateTrackValue}>
              {formatDisplayDate(item.end_date)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title={t('academicPeriods.title', 'Periodos Académicos')}
        subtitle={t('titles.academicPeriodsSubtitle', 'Gestión de fechas de inicio y fin de periodos')}
      />

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
          style={{ flex: 1 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* HERO SPOTLIGHT BENTO CARD: Resumen de estado actual del ciclo escolar */}
              <View style={styles.heroCard}>
                <View style={styles.heroCardTop}>
                  <View style={styles.heroBadgeRow}>
                    <View style={[
                      styles.heroStatusBadge, 
                      { backgroundColor: activePeriod ? (isDark ? `${Colors.primary}25` : `${Colors.primary}15`) : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#F1F5F9') }
                    ]}>
                      <View style={[
                        styles.liveIndicatorDot, 
                        { backgroundColor: activePeriod ? Colors.primary : (isDark ? '#64748B' : '#94A3B8') }
                      ]} />
                      <Text style={[
                        styles.heroStatusText, 
                        { color: activePeriod ? Colors.primary : (isDark ? '#94A3B8' : '#64748B') }
                      ]}>
                        {activePeriod 
                          ? t('academicPeriods.activePeriodBadge', 'Periodo Activo') 
                          : t('academicPeriods.noActivePeriod', 'Sin periodo en curso')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.heroTitle}>
                    {activePeriod 
                      ? t('academicPeriods.periodCardTitle', { number: activePeriod.period_number })
                      : t('academicPeriods.calendarView', 'Calendario Escolar')}
                  </Text>
                </View>

                {activePeriod ? (
                  <View style={styles.heroInfoBlock}>
                    <View style={styles.heroDateRow}>
                      <CalendarDays size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.heroDateText}>
                        {formatDisplayDate(activePeriod.start_date)} — {formatDisplayDate(activePeriod.end_date)}
                      </Text>
                    </View>
                    <View style={styles.heroMetaPills}>
                      <View style={styles.metaPill}>
                        <Clock size={12} color={Colors.text.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.metaPillText}>
                          {t('academicPeriods.schoolDaysCount', { count: calculateDuration(activePeriod.start_date, activePeriod.end_date).days, defaultValue: `${calculateDuration(activePeriod.start_date, activePeriod.end_date).days} días lectivos` })}
                        </Text>
                      </View>
                      <View style={styles.metaPill}>
                        <Layers size={12} color={Colors.text.muted} style={{ marginRight: 4 }} />
                        <Text style={styles.metaPillText}>
                          {t('academicPeriods.weeksCount', { count: calculateDuration(activePeriod.start_date, activePeriod.end_date).weeks, defaultValue: `${calculateDuration(activePeriod.start_date, activePeriod.end_date).weeks} semanas` })}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.heroSubtitle}>
                    {nextUpcomingPeriod 
                      ? `${t('academicPeriods.statusUpcoming', 'Próximo')}: ${t('academicPeriods.periodCardTitle', { number: nextUpcomingPeriod.period_number })} (${formatDisplayDate(nextUpcomingPeriod.start_date)})`
                      : t('academicPeriods.guidelinesNotice', 'Configura los intervalos lectivos. Cada periodo debe ser cronológicamente consecutivo y sin solapamiento.')}
                  </Text>
                )}
              </View>

              {/* Barra de Título de Sección y Botón de Acción Principal */}
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {t('academicPeriods.registeredPeriodsCount', { count: periods.length, defaultValue: `Periodos del Ciclo (${periods.length})` })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addPeriodBtn}
                  onPress={handleOpenCreateModal}
                  activeOpacity={0.8}
                >
                  <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                  <Text style={styles.addPeriodBtnText}>
                    {t('academicPeriods.addPeriod', 'Nuevo Periodo')}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <CalendarIcon size={32} color={Colors.text.muted} />
              </View>
              <Text style={styles.emptyText}>
                {t('academicPeriods.emptyList', 'No hay periodos académicos registrados.')}
              </Text>
              <TouchableOpacity
                style={[styles.addPeriodBtn, { alignSelf: 'center', marginTop: 14 }]}
                onPress={handleOpenCreateModal}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.addPeriodBtnText}>
                  {t('academicPeriods.addPeriod', 'Nuevo Periodo')}
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* MODAL: Crear / Editar Periodo con DatePickerSelector y Validaciones en Tiempo Real */}
      <BottomModal
        visible={modalVisible}
        onClose={() => {
          setActivePicker(null);
          setModalVisible(false);
        }}
      >
        <View style={styles.modalContent}>
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
            <TouchableOpacity 
              onPress={() => {
                setActivePicker(null);
                setModalVisible(false);
              }} 
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
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

            {/* Selector de Fecha de Inicio Multiplataforma */}
            <DatePickerSelector
              label={t('academicPeriods.startDate', 'Fecha de Inicio *')}
              value={startDate}
              maxDate={endDate || undefined}
              onChange={(d) => setStartDate(d)}
              placeholder={t('academicPeriods.selectStartDate', 'Seleccionar fecha de inicio')}
              isOpen={activePicker === 'start'}
              onToggle={(open) => setActivePicker(open ? 'start' : null)}
            />

            {/* Selector de Fecha de Fin Multiplataforma */}
            <DatePickerSelector
              label={t('academicPeriods.endDate', 'Fecha de Fin *')}
              value={endDate}
              minDate={startDate || undefined}
              error={validationState.reason === 'end_before_start' ? validationState.message : undefined}
              onChange={(d) => setEndDate(d)}
              placeholder={t('academicPeriods.selectEndDate', 'Seleccionar fecha de fin')}
              isOpen={activePicker === 'end'}
              onToggle={(open) => setActivePicker(open ? 'end' : null)}
            />

            {/* Banner de Validación en Tiempo Real con Soporte Modo Oscuro */}
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
                <CheckCircle size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.validSummaryText}>
                  {t('academicPeriods.validRangeSummary', { 
                    days: calculateDuration(startDate, endDate).days,
                    defaultValue: `Rango válido de ${calculateDuration(startDate, endDate).days} días lectivos sin colisiones.`
                  })}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Fijo: Botón de Guardar / Crear */}
          <View style={styles.modalFooter}>
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
          </View>
        </View>
      </BottomModal>
    </View>
  );
}

const createStyles = (Colors, theme) => {
  const isDark = theme === 'dark';
  const cardBg = Colors.card;
  const textColor = Colors.text.primary;
  const subtextColor = Colors.text.secondary;
  const mutedColor = Colors.text.muted;
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const surfaceMuted = isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background,
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    // HERO BENTO SPOTLIGHT CARD
    heroCard: {
      backgroundColor: cardBg,
      borderRadius: BorderRadius.xl,
      padding: 16,
      marginTop: Spacing.md,
      marginBottom: Spacing.lg,
      borderWidth: 1,
      borderColor,
      ...Shadows.card,
    },
    heroCardTop: {
      marginBottom: 10,
    },
    heroBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    heroStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
      gap: 6,
    },
    heroStatusText: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: textColor,
      letterSpacing: -0.3,
    },
    heroSubtitle: {
      fontSize: 12,
      color: subtextColor,
      lineHeight: 18,
    },
    heroInfoBlock: {
      marginTop: 2,
    },
    heroDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    heroDateText: {
      fontSize: 14,
      fontWeight: '700',
      color: textColor,
    },
    heroMetaPills: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    metaPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      borderWidth: 1,
      borderColor,
    },
    metaPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: subtextColor,
    },
    // SECTION HEADER & ACTION BUTTON
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: textColor,
      letterSpacing: -0.2,
    },
    addPeriodBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.primary,
      paddingHorizontal: 14,
      height: 38,
      borderRadius: BorderRadius.full,
      gap: 6,
      ...Shadows.card,
    },
    addPeriodBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    // PERIOD BENTO CARDS
    periodCard: {
      backgroundColor: cardBg,
      borderRadius: BorderRadius.lg,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor,
      ...Shadows.card,
    },
    periodCardActive: {
      borderColor: '#10B981',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    numberBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberBadgeText: {
      fontSize: 15,
      fontWeight: '800',
    },
    periodTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: textColor,
      lineHeight: 18,
    },
    periodDurationSub: {
      fontSize: 11,
      fontWeight: '500',
      color: mutedColor,
      marginTop: 1,
    },
    cardHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
      gap: 5,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    liveIndicatorDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    actionButtonsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 2,
    },
    iconBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: surfaceMuted,
    },
    deleteIconBtn: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
    },
    // HORIZONTAL DATE TRACK
    dateTrack: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: surfaceMuted,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor,
    },
    dateSegment: {
      flex: 1,
    },
    dateTrackLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: mutedColor,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 2,
    },
    dateTrackValue: {
      fontSize: 13,
      fontWeight: '700',
      color: textColor,
    },
    dateArrowBox: {
      paddingHorizontal: 8,
    },
    // EMPTY & LOADING STATES
    centerContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1,
      borderColor,
    },
    emptyText: {
      fontSize: 13,
      color: mutedColor,
      textAlign: 'center',
    },
    // MODAL
    modalContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      maxHeight: '100%',
      flexShrink: 1,
      display: 'flex',
      flexDirection: 'column',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: textColor,
    },
    modalSubtitle: {
      fontSize: 12,
      color: mutedColor,
      marginTop: 2,
    },
    closeBtn: {
      padding: 4,
    },
    modalScrollView: {
      flexGrow: 0,
      flexShrink: 1,
      maxHeight: 300,
    },
    modalScrollContent: {
      paddingBottom: 8,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: textColor,
      marginBottom: 6,
    },
    textInput: {
      backgroundColor: surfaceMuted,
      borderWidth: 1,
      borderColor,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: textColor,
    },
    validationErrorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
      borderRadius: BorderRadius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5',
      marginBottom: 14,
    },
    validationErrorText: {
      fontSize: 12,
      color: isDark ? '#FCA5A5' : '#B91C1C',
      flex: 1,
      lineHeight: 16,
      fontWeight: '600',
    },
    validSummaryBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#F0FDF4',
      borderRadius: BorderRadius.md,
      padding: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(16, 185, 129, 0.35)' : '#86EFAC',
      marginBottom: 14,
    },
    validSummaryText: {
      fontSize: 12,
      color: isDark ? '#6EE7B7' : '#15803D',
      fontWeight: '600',
      flex: 1,
    },
    modalFooter: {
      paddingTop: 12,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: borderColor,
    },
    submitBtn: {
      backgroundColor: Colors.primary,
      borderRadius: BorderRadius.full,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.card,
    },
    submitBtnDisabled: {
      opacity: 0.45,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
  });
};
