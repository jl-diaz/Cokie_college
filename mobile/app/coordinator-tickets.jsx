import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  TextInput, 
  ScrollView 
} from 'react-native';
import api from '../src/utils/api';
import { X, AlertCircle } from 'lucide-react-native';
import BottomModal from '../src/components/BottomModal';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';

export default function CoordinatorTicketsScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { showAlert } = useAlert();
  const isDark = theme === 'dark';
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'approved', 'rejected'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject'
  const [coordinatorMessage, setCoordinatorMessage] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setPage(1);
    fetchTickets(1, true);
  }, [filterStatus]);

  const fetchTickets = async (pageNum = page, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      
      const res = await api.get('/coordinator/grade-tickets', {
        params: { 
          status: filterStatus !== 'all' ? filterStatus : undefined,
          page: pageNum, 
          limit: 50 
        }
      });
      const newTickets = res.data?.data || [];
      
      if (reset) {
        setTickets(newTickets);
      } else {
        setTickets(prev => [...prev, ...newTickets]);
      }
      setTotalPages(res.data?.totalPages || 1);
    } catch (error) {
      console.error('Error fetching grade tickets:', error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: t('coordinatorTickets.ticketFetchError', 'No se pudieron cargar los tickets de extensión de notas.')
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTickets(nextPage);
    }
  };

  const handleOpenActionModal = (ticket, type) => {
    setSelectedTicket(ticket);
    setActionType(type);
    setCoordinatorMessage('');
  };

  const handleConfirmAction = async () => {
    if (!selectedTicket || !actionType) return;

    if (actionType === 'reject' && !coordinatorMessage.trim()) {
      showAlert({
        type: 'warning',
        title: t('dashboard.warning', 'Mensaje requerido'),
        message: t('coordinatorTickets.enterRejectReasonWarning', 'Por favor ingresa el motivo del rechazo para informar al profesor.')
      });
      return;
    }

    try {
      setProcessing(true);
      const status = actionType === 'approve' ? 'approved' : 'rejected';
      await api.put(`/coordinator/grade-tickets/${selectedTicket.id}`, {
        status,
        coordinator_message: coordinatorMessage.trim() || undefined
      });

      setSelectedTicket(null);
      setActionType(null);
      showAlert({
        type: 'success',
        title: t('coordinatorTickets.successTitle', 'Operación exitosa'),
        message: t('coordinatorTickets.ticketProcessedSuccess', 'El ticket ha sido procesado correctamente.')
      });
      setPage(1);
      fetchTickets(1, true);
    } catch (error) {
      console.error('Error processing ticket:', error);
      setSelectedTicket(null);
      setActionType(null);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudo procesar la solicitud.'
      });
    } finally {
      setProcessing(false);
    }
  };

  const filteredTickets = useMemo(() => {
    if (filterStatus === 'all') return tickets;
    return tickets.filter(t => t.status === filterStatus);
  }, [tickets, filterStatus]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Renderizado estilo 2-tone Card inspirado en la referencia
  const renderTicketCard = ({ item }) => {
    const isPending = item.status === 'pending';
    const isApproved = item.status === 'approved';
    const isRejected = item.status === 'rejected';

    const statusLabel = isPending 
      ? t('dashboard.pending', 'Pendiente') 
      : isApproved 
        ? t('dashboard.approved', 'Aprobado') 
        : t('dashboard.rejected', 'Denegado');

    return (
      <View style={[styles.card, isPending ? styles.cardPendingBorder : styles.cardSolidBorder]}>
        {/* HEADER SUPERIOR: Nombre del profesor + Estado debajo con separación */}
        <View style={[
          styles.cardHeader,
          isPending && styles.headerPending,
          isApproved && styles.headerApproved,
          isRejected && styles.headerRejected,
        ]}>
          <Text style={[
            styles.teacherName,
            isPending && styles.teacherNamePending,
            isApproved && styles.teacherNameApproved,
            isRejected && styles.teacherNameRejected,
          ]} numberOfLines={1}>
            {item.teacher?.full_name || t('dashboard.teacher', 'Docente')}
          </Text>

          <View style={[
            styles.statusBadge,
            isPending && styles.badgePending,
            isApproved && styles.badgeApproved,
            isRejected && styles.badgeRejected,
          ]}>
            <Text style={[
              styles.statusText,
              isPending && styles.statusTextPending,
              isApproved && styles.statusTextApproved,
              isRejected && styles.statusTextRejected,
            ]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* CUERPO DEL RECUADRO: Filas de información separadas horizontalmente sin iconos */}
        <View style={styles.cardBody}>
          {/* Fila: Periodo */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('dashboard.period', 'Periodo')}:</Text>
            <Text style={styles.infoValue}>{t('dashboard.period', 'Periodo')} {item.period}</Text>
          </View>

          {/* Fila: Día solicitado */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('coordinatorTickets.requestedDays', 'Día solicitado')}:</Text>
            <Text style={styles.infoValue}>+{item.days_requested} {t('time.days', 'día(s)')}</Text>
          </View>

          {/* Fila: Motivo */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('coordinatorJustifications.reason', 'Motivo')}:</Text>
            <Text style={styles.infoValue}>{item.reason || t('coordinatorJustifications.noReasonSpecified', 'Sin motivo especificado')}</Text>
          </View>

          {/* Fila: Extensión */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('coordinatorTickets.extension', 'Extensión')}:</Text>
            <Text style={styles.infoValue}>
              {item.approved_until 
                ? formatDate(item.approved_until) 
                : (isApproved 
                    ? t('coordinatorJustifications.approved', 'Aprobada') 
                    : isRejected 
                      ? t('coordinatorTickets.rejected', 'Denegada') 
                      : t('coordinatorTickets.pendingApproval', 'Pendiente de aprobación'))}
            </Text>
          </View>

          {/* Fila: Mensaje del Coordinador (si existe) */}
          {item.coordinator_message ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('coordinatorTickets.reply', 'Respuesta')}:</Text>
              <Text style={styles.infoValue}>{item.coordinator_message}</Text>
            </View>
          ) : null}

          {/* Fila: Fecha de Solicitud */}
          <View style={[styles.infoRow, { marginBottom: isPending ? 14 : 2 }]}>
            <Text style={styles.infoLabel}>{t('coordinatorTickets.requestDate', 'Fecha solicitud')}:</Text>
            <Text style={styles.infoValue}>{formatDate(item.created_at)}</Text>
          </View>

          {/* Botones de Acción si está Pendiente */}
          {isPending && (
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.rejectBtn]} 
                onPress={() => handleOpenActionModal(item, 'reject')}
                activeOpacity={0.8}
              >
                <Text style={styles.rejectBtnText}>{t('dashboard.reject', 'Denegar')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.approveBtn]} 
                onPress={() => handleOpenActionModal(item, 'approve')}
                activeOpacity={0.8}
              >
                <Text style={styles.approveBtnText}>{t('dashboard.approve', 'Aprobar')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('menu.grade_tickets', 'Tickets de Extensión')} 
        subtitle={t('home.gradeTicketsDesc', 'Solicitudes de tiempo extra para ingreso de notas')} 
      />

      <View style={styles.filterBar}>
        {[
          { key: 'all', label: t('users.tabAll', 'Todos') },
          { key: 'pending', label: t('dashboard.pending', 'Pendientes') },
          { key: 'approved', label: t('dashboard.approved', 'Aprobados') },
          { key: 'rejected', label: t('dashboard.rejected', 'Denegados') }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filterStatus === tab.key && styles.filterTabActive]}
            onPress={() => setFilterStatus(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterTabText, filterStatus === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTicketCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AlertCircle size={40} color={Colors.text.muted} />
              <Text style={styles.emptyText}>{t('tickets.noRequests', 'No hay solicitudes registradas.')}</Text>
            </View>
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} /> : null}
        />
      )}

      {/* Modal de Acción (Aprobar / Rechazar) */}
      <BottomModal
        visible={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.modalTitle}>
                {actionType === 'approve' ? t('teacherGrades.approveTicketTitle', 'Aprobar Extensión de Notas') : t('teacherGrades.rejectTicketTitle', 'Denegar Solicitud de Extensión')}
              </Text>
              <Text style={styles.modalSubtitle}>
                {selectedTicket?.teacher?.full_name} — {t('dashboard.period', 'Periodo')} {selectedTicket?.period} (+{selectedTicket?.days_requested} {t('days.daysCount', 'días')})
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTicket(null)} style={{ padding: 4 }}>
              <X size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Text style={styles.inputLabel}>
              {actionType === 'approve' ? t('teacherGrades.optionalObsLabel', 'Mensaje u observaciones (Opcional):') : t('teacherGrades.rejectReasonLabel', 'Motivo del rechazo (Requerido):')}
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              placeholder={actionType === 'approve' ? t('teacherGrades.approveMsgPlaceholder', 'Escribe algún mensaje para el profesor...') : t('teacherGrades.rejectMsgPlaceholder', 'Explica la razón de la denegación...')}
              placeholderTextColor={Colors.text.muted}
              value={coordinatorMessage}
              onChangeText={setCoordinatorMessage}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setSelectedTicket(null)}
                disabled={processing}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>{t('dashboard.cancel', 'Cancelar')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.modalConfirmBtn, 
                  actionType === 'approve' ? styles.btnGreen : styles.btnRed
                ]}
                onPress={handleConfirmAction}
                disabled={processing}
                activeOpacity={0.8}
              >
                {processing ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    {actionType === 'approve' ? t('dashboard.confirmApprove', 'Confirmar Aprobación') : t('dashboard.confirmReject', 'Confirmar Rechazo')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </BottomModal>
    </View>
  );
}

const createStyles = (Colors, theme) => {
  const isDark = theme === 'dark';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const bodyBg = isDark ? '#18181B' : '#FFFFFF';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    filterBar: {
      flexDirection: 'row',
      backgroundColor: Colors.card,
      padding: 5,
      marginHorizontal: Spacing.lg,
      marginTop: -10,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: cardBorder,
      ...Shadows.card,
    },
    filterTab: {
      flex: 1,
      paddingVertical: 7,
      alignItems: 'center',
      borderRadius: BorderRadius.lg,
    },
    filterTabActive: {
      backgroundColor: Colors.primary,
    },
    filterTabText: {
      fontSize: Typography.size.xs,
      fontWeight: '700',
      color: Colors.text.muted,
    },
    filterTabTextActive: {
      color: '#FFF',
    },
    listContent: {
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      paddingBottom: Spacing.xl,
    },

    // 2-TONE CARD STYLES
    card: {
      backgroundColor: bodyBg,
      borderRadius: BorderRadius.xl,
      marginBottom: 14,
      overflow: 'hidden',
      ...Shadows.card,
    },
    cardPendingBorder: {
      borderStyle: 'dashed',
      borderWidth: 1.5,
      borderColor: isDark ? '#F59E0B' : '#D97706',
    },
    cardSolidBorder: {
      borderStyle: 'solid',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#000000',
    },

    // HEADER SUPERIOR (TIPO BANNER DE COLOR)
    cardHeader: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: cardBorder,
    },
    headerPending: {
      backgroundColor: isDark ? 'rgba(234, 179, 8, 0.18)' : '#FEF3C7',
    },
    headerApproved: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5',
    },
    headerRejected: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#FFE4E6',
    },

    teacherName: {
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.2,
      marginBottom: 6,
    },
    teacherNamePending: {
      color: isDark ? '#FDE047' : '#92400E',
    },
    teacherNameApproved: {
      color: isDark ? '#6EE7B7' : '#065F46',
    },
    teacherNameRejected: {
      color: isDark ? '#FCA5A5' : '#9F1239',
    },

    // PILL / BADGE DE ESTADO
    statusBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
    },
    badgePending: {
      backgroundColor: isDark ? 'rgba(234, 179, 8, 0.3)' : '#FDE68A',
    },
    badgeApproved: {
      backgroundColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
    },
    badgeRejected: {
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECDD3',
    },

    statusText: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    statusTextPending: {
      color: isDark ? '#FEF08A' : '#78350F',
    },
    statusTextApproved: {
      color: isDark ? '#A7F3D0' : '#064E3B',
    },
    statusTextRejected: {
      color: isDark ? '#FECDD3' : '#881337',
    },

    // CUERPO DE LA TARJETA (TABLA HORIZONTAL LIMPIA)
    cardBody: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 9,
    },
    infoLabel: {
      width: 125, // Separación horizontal generosa
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    infoValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#F1F5F9' : '#1E293B',
      lineHeight: 18,
    },

    // ACCIONES
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    actionBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: 38,
      borderRadius: BorderRadius.lg,
    },
    rejectBtn: {
      borderWidth: 1,
      borderColor: isDark ? '#3F3F46' : '#18181B',
      backgroundColor: '#18181B',
    },
    rejectBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: Typography.size.sm,
    },
    approveBtn: {
      backgroundColor: Colors.primary,
    },
    approveBtnText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: Typography.size.sm,
    },

    emptyContainer: {
      padding: Spacing['2xl'],
      alignItems: 'center',
    },
    emptyText: {
      marginTop: Spacing.md,
      color: Colors.text.muted,
      fontSize: Typography.size.md,
    },

    // MODAL
    modalContainer: {
      width: '100%',
      padding: Spacing.lg,
      maxHeight: '100%',
      flexShrink: 1,
      display: 'flex',
      flexDirection: 'column',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
    },
    modalTitle: {
      fontSize: Typography.size.lg,
      fontWeight: '800',
      color: Colors.primary,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: Typography.size.xs,
      color: Colors.text.muted,
      marginBottom: Spacing.lg,
    },
    inputLabel: {
      fontSize: Typography.size.xs,
      fontWeight: '700',
      color: Colors.text.primary,
      marginBottom: 6,
    },
    modalInput: {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC',
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      fontSize: 16,
      color: Colors.text.primary,
      textAlignVertical: 'top',
      minHeight: 90,
      marginBottom: Spacing.xl,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    modalCancelBtn: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: BorderRadius.lg,
      backgroundColor: '#18181B',
      borderWidth: 1,
      borderColor: isDark ? '#3F3F46' : '#18181B',
    },
    modalCancelText: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    modalConfirmBtn: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: BorderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnGreen: { backgroundColor: Colors.primary },
    btnRed: { 
      backgroundColor: '#18181B',
      borderWidth: 1,
      borderColor: isDark ? '#3F3F46' : '#18181B',
    },
    modalConfirmText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: Typography.size.sm,
    },
  });
};
