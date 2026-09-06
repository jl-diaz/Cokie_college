import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import api from '../src/utils/api';
import { Check, X, Clock, Calendar, User, FileText, Filter, AlertCircle } from 'lucide-react-native';
import BottomModal from '../src/components/BottomModal';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';

export default function CoordinatorTicketsScreen() {
  const { t } = useTranslation();
  const { colors: Colors } = useTheme();
  const { showAlert } = useAlert();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

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
  }, []);

  const fetchTickets = async (pageNum = page, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      
      const res = await api.get('/coordinator/grade-tickets', {
        params: { page: pageNum, limit: 50 }
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
        message: 'No se pudieron cargar los tickets de extensión de notas.'
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
        message: 'Por favor ingresa el motivo del rechazo para informar al profesor.'
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

      showAlert({
        type: 'success',
        title: t('dashboard.success', 'Operación exitosa'),
        message: `El ticket ha sido ${status === 'approved' ? 'aprobado' : 'denegado'} correctamente.`
      });
      setSelectedTicket(null);
      setActionType(null);
      setPage(1);
      fetchTickets(1, true);
    } catch (error) {
      console.error('Error processing ticket:', error);
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
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const renderTicketCard = ({ item }) => {
    const isPending = item.status === 'pending';
    const isApproved = item.status === 'approved';
    const isRejected = item.status === 'rejected';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.teacherInfo}>
            <User size={18} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.teacherName}>{item.teacher?.full_name || t('dashboard.teacher', 'Docente')}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            isPending && styles.badgePending,
            isApproved && styles.badgeApproved,
            isRejected && styles.badgeRejected
          ]}>
            <Text style={[
              styles.statusText,
              isPending && styles.statusTextPending,
              isApproved && styles.statusTextApproved,
              isRejected && styles.statusTextRejected
            ]}>
              {isPending ? t('dashboard.pending', 'PENDIENTE').toUpperCase() : isApproved ? t('dashboard.approved', 'APROBADO').toUpperCase() : t('dashboard.rejected', 'DENEGADO').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Calendar size={14} color={Colors.text.muted} style={{ marginRight: 4 }} />
            <Text style={styles.detailText}>{t('dashboard.period', 'Periodo')} {item.period}</Text>
          </View>
          <View style={styles.detailItem}>
            <Clock size={14} color={Colors.text.muted} style={{ marginRight: 4 }} />
            <Text style={styles.detailText}>+ {item.days_requested} {t('days.daysCount', 'día(s) solicitados')}</Text>
          </View>
        </View>

        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>{t('dashboard.reason', 'Motivo de la solicitud')}:</Text>
          <Text style={styles.reasonText}>{item.reason}</Text>
        </View>

        {isApproved && item.approved_until && (
          <View style={styles.approvedNotice}>
            <Clock size={14} color={Colors.status.approved} style={{ marginRight: 6 }} />
            <Text style={styles.approvedNoticeText}>
              Extensión válida hasta: {formatDate(item.approved_until)}
            </Text>
          </View>
        )}

        {item.coordinator_message && (
          <View style={styles.commentBox}>
            <Text style={styles.commentLabel}>{t('dashboard.coordinatorResponse', 'Mensaje del Coordinador')}:</Text>
            <Text style={styles.commentText}>{item.coordinator_message}</Text>
          </View>
        )}

        <Text style={styles.dateText}>Solicitado el {formatDate(item.created_at)}</Text>

        {isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]} 
              onPress={() => handleOpenActionModal(item, 'reject')}
            >
              <X size={16} color="#dc2626" style={{ marginRight: 4 }} />
              <Text style={styles.rejectBtnText}>{t('dashboard.reject', 'Denegar')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.approveBtn]} 
              onPress={() => handleOpenActionModal(item, 'approve')}
            >
              <Check size={16} color="#15803d" style={{ marginRight: 4 }} />
              <Text style={styles.approveBtnText}>{t('dashboard.approve', 'Aprobar')}</Text>
            </TouchableOpacity>
          </View>
        )}
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
          </View>
      </BottomModal>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    padding: 6,
    marginHorizontal: Spacing.lg,
    marginTop: -10,
    borderRadius: BorderRadius.xl,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.text.muted,
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teacherName: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.md,
  },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeApproved: { backgroundColor: '#dcfce7' },
  badgeRejected: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusTextPending: { color: '#d97706' },
  statusTextApproved: { color: '#15803d' },
  statusTextRejected: { color: '#b91c1c' },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.muted,
  },
  reasonBox: {
    backgroundColor: Colors.gray[50] || '#f8fafc',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.text.muted,
    marginBottom: 2,
  },
  reasonText: {
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
    lineHeight: 18,
  },
  approvedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  approvedNoticeText: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: '#166534',
  },
  commentBox: {
    backgroundColor: '#fffbeb',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  commentLabel: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#b45309',
  },
  commentText: {
    fontSize: Typography.size.xs,
    color: '#78350f',
  },
  dateText: {
    fontSize: 10,
    color: Colors.text.muted,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  rejectBtnText: {
    color: '#dc2626',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
  },
  approveBtn: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  approveBtnText: {
    color: '#15803d',
    fontWeight: Typography.weight.bold,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
    margin: 0,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'] || 24,
    borderTopRightRadius: BorderRadius['2xl'] || 24,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
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
    fontWeight: Typography.weight.bold,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: Colors.gray[50] || '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.size.sm,
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
  },
  modalCancelText: {
    color: Colors.text.muted,
    fontWeight: Typography.weight.bold,
  },
  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnGreen: { backgroundColor: '#16a34a' },
  btnRed: { backgroundColor: '#dc2626' },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: Typography.weight.bold,
    fontSize: Typography.size.sm,
  }
});


