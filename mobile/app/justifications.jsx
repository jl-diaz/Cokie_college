<<<<<<< HEAD
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
=======
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import api from '../src/utils/api';
import { useAuth } from '../src/context/AuthContext';
import { UploadCloud, FileText, Calendar, ChevronDown, CheckCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

export default function JustificationsScreen() {
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [evidenceUri, setEvidenceUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const categories = ['Cita Médica', 'Justificación Médica', 'Motivo Familiar', 'Otro'];
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
<<<<<<< HEAD
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
=======
      const formatted = selectedDate.toISOString().split('T')[0];
      setDate(formatted);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permiso requerido', 'Necesitas permitir el acceso a la galería para subir evidencias.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setEvidenceUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!date || !reason || !category) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/student/justifications', {
        absence_date: date,
        reason: `[${category}] ${reason}`,
        evidence_url: evidenceUri || '' 
      });

      Alert.alert('Éxito', 'Solicitud enviada a coordinación exitosamente.');
      setDate('');
      setReason('');
      setCategory('');
      setEvidenceUri(null);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo enviar la solicitud.');
    } finally {
<<<<<<< HEAD
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
=======
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitud de Permisos</Text>
        <Text style={styles.headerSubtitle}>Justifica tu ausencia</Text>
      </View>

      <View style={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name}</Text>
            <Text style={styles.profileDetail}>Carnet: {profile?.institutional_code}</Text>
            <Text style={styles.profileDetail}>Rol: {profile?.role?.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <View style={styles.iconBox}><Calendar size={14} color="#0B1956" /></View>
              <Text style={styles.label}>Fecha del permiso</Text>
            </View>
            <TouchableOpacity 
              style={styles.inputTouchable} 
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.inputText, !date && styles.placeholderText]}>
                {date ? date : "Seleccionar fecha"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date ? new Date(date) : new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.labelNoIcon}>Tipo de solicitud</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.labelNoIcon}>Detalles del motivo</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Escriba aquí los detalles detallados..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              placeholderTextColor="#8a8da0"
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <View style={styles.iconBox}><UploadCloud size={14} color="#0B1956" /></View>
              <Text style={styles.label}>Comprobante / Evidencia</Text>
            </View>
            <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7} onPress={pickImage}>
              {evidenceUri ? (
                <>
                  <CheckCircle size={32} color="#10b981" />
                  <Text style={[styles.uploadText, { color: '#10b981' }]}>Imagen adjuntada</Text>
                  <Text style={styles.uploadSubtext}>Toca para cambiar imagen</Text>
                </>
              ) : (
                <>
                  <UploadCloud size={32} color="#8a8da0" />
                  <Text style={styles.uploadText}>Adjuntar justificante</Text>
                  <Text style={styles.uploadSubtext}>(Toca para abrir galería)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.btn, loading && styles.btnDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar a Coordinación</Text>}
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
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
=======
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0B1956',
    padding: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  content: {
    padding: 20,
    marginTop: -30,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8D9ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#0B1956',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: 'bold', color: '#0B1956', marginBottom: 2 },
  profileDetail: { fontSize: 12, color: '#8a8da0', textTransform: 'capitalize' },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  field: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox: {
    width: 24,
    height: 24,
    backgroundColor: '#F5F7FA',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  label: { fontSize: 11, fontWeight: 'bold', color: '#0B1956', textTransform: 'uppercase', letterSpacing: 0.5 },
  labelNoIcon: { fontSize: 11, fontWeight: 'bold', color: '#0B1956', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputTouchable: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
  },
  inputText: {
    fontSize: 15,
    color: '#0B1956',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#8a8da0',
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#0B1956',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
  },
  chipScroll: {
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: '#0B1956',
  },
  chipText: {
    color: '#8a8da0',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFF',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E8D9ED',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  uploadText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0B1956',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#8a8da0',
    marginTop: 4,
  },
  btn: {
    backgroundColor: '#0B1956',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
});
