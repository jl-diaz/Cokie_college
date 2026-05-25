import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import api from '../src/utils/api';
import { FileText, Calendar, Plus, X, Upload, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function JustificationsScreen() {
  const [justifications, setJustifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    reason: '',
    evidence: null
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchJustifications();
  }, []);

  const fetchJustifications = async () => {
    try {
      const response = await api.get('/student/justifications');
      setJustifications(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchJustifications();
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });
      
      if (!result.canceled) {
        setFormData({ ...formData, evidence: result.assets[0] });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Format date without timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setFormData({ ...formData, date: formattedDate });
    }
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.reason) {
      Alert.alert('Error', 'Por favor completa la fecha y el motivo.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/student/justifications', {
        absence_date: formData.date,
        reason: formData.reason,
        evidence_url: formData.evidence ? 'mock-url' : null
      });
      
      Alert.alert('Éxito', 'Solicitud enviada correctamente.');
      setModalVisible(false);
      setFormData({ date: '', reason: '', evidence: null });
      fetchJustifications();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'approved': return { color: Colors.status.approved, bg: '#f0fdf4', icon: CheckCircle, label: 'Aprobada' };
      case 'rejected': return { color: Colors.status.rejected, bg: '#fef2f2', icon: XCircle, label: 'Rechazada' };
      default: return { color: Colors.status.pending, bg: '#fffbeb', icon: Clock, label: 'Pendiente' };
    }
  };

  const renderItem = ({ item }) => {
    const status = getStatusStyle(item.status);
    const StatusIcon = status.icon;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateInfo}>
            <Calendar size={16} color={Colors.text.muted} />
            <Text style={styles.dateText}>{new Date(item.absence_date).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <StatusIcon size={14} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        
        <Text style={styles.reasonLabel}>Motivo:</Text>
        <Text style={styles.reasonText}>{item.reason}</Text>
        
        {item.coordinator_message && (
          <View style={styles.obsContainer}>
            <Text style={styles.obsLabel}>Respuesta del Coordinador:</Text>
            <Text style={styles.obsText}>{item.coordinator_message}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading && justifications.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Justificaciones</Text>
        <Text style={styles.headerSubtitle}>Gestiona tus permisos de ausencia</Text>
      </View>

      <FlatList
        data={justifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Solicitudes</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <Plus size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Nueva</Text>
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <FileText size={48} color={Colors.gray[300]} style={{marginBottom: 16}} />
            <Text style={styles.emptyText}>No has realizado ninguna solicitud de justificación.</Text>
          </View>
        }
        ListFooterComponent={<View style={{height: 40}} />}
      />

      {/* New Justification Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Justificación</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[]} // Empty data for a "fake" ScrollView effect if needed, but better to use a simple View if not many inputs
              renderItem={null}
              ListHeaderComponent={
                <View>
<View style={styles.formGroup}>
                      <Text style={styles.label}>Fecha de Ausencia</Text>
                      <TouchableOpacity style={styles.datePickerBtn} onPress={showDatepicker}>
                        <Calendar size={18} color={Colors.primary} />
                        <Text style={[styles.datePickerText, formData.date ? styles.selectedText : null]}>
                          {formData.date || 'Seleccionar fecha'}
                        </Text>
                      </TouchableOpacity>
                      {showDatePicker && (
                        <DateTimePicker
                          value={formData.date ? new Date(formData.date) : new Date()}
                          mode="date"
                          display="default"
                          onChange={handleDateChange}
                          maximumDate={new Date()}
                        />
                      )}
                    </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Motivo</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Explica el motivo de tu ausencia..."
                      placeholderTextColor={Colors.text.muted}
                      numberOfLines={4}
                      value={formData.reason}
                      onChangeText={(text) => setFormData({ ...formData, reason: text })}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Evidencia (Imagen o PDF)</Text>
                    <TouchableOpacity style={styles.uploadBtn} onPress={handlePickDocument}>
                      <Upload size={20} color={Colors.primary} />
                      <Text style={styles.uploadBtnText}>
                        {formData.evidence ? formData.evidence.name : 'Subir archivo'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity 
                    style={styles.submitBtn} 
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>Enviar Solicitud</Text>
                    )}
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 10,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  headerTitle: { color: '#FFF', fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.sm, marginTop: 4 },
  content: { padding: Spacing.xl },
  sectionHeader: {
    flexDirection: 'row',    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    ...Shadows.elevated,
  },
  addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 6, fontSize: Typography.size.sm },
  emptyCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: 40,
    alignItems: 'center',
    ...Shadows.card,
    marginTop: 20,
  },
  emptyText: { color: Colors.text.muted, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',    marginBottom: Spacing.lg,
  },
  dateInfo: { flexDirection: 'row', alignItems: 'center' },
  dateText: { marginLeft: 8, fontWeight: Typography.weight.bold, color: Colors.text.primary, fontSize: Typography.size.md },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  statusText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, marginLeft: 6 },
  reasonLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.muted, textTransform: 'uppercase', marginBottom: 4 },
  reasonText: { fontSize: Typography.size.md, color: Colors.text.primary, lineHeight: 22, marginBottom: Spacing.lg },
  obsContainer: {
    backgroundColor: Colors.gray[50],
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primaryLight,
  },
  obsLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.primary, marginBottom: 4 },
  obsText: { fontSize: Typography.size.sm, color: Colors.text.secondary, fontStyle: 'italic' },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.primary },
  formGroup: { marginBottom: 20 },
  label: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 16,
    fontSize: Typography.size.md,
    color: Colors.text.primary,
  },
  textArea: { height: 50, textAlignVertical: 'top' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderStyle: 'dashed',
  },
  uploadBtnText: { marginLeft: 10, color: Colors.text.secondary, fontSize: Typography.size.sm },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    ...Shadows.elevated,
  },
  submitBtnText: { color: '#FFF', fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  datePickerText: {
    marginLeft: 10,
    fontSize: Typography.size.md,
    color: Colors.text.muted,
  },
});
