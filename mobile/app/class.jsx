import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Switch, ScrollView } from 'react-native';
import api from '../src/utils/api';
import { BookOpen, X, ShieldAlert, Award, FileText, ChevronDown, Clock, Users } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function ClassScreen() {
  const [activeClassData, setActiveClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingAttendance, setSavingAttendance] = useState(new Set());

  // Conduct codes modal
  const [conductModalVisible, setConductModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [conductCodes, setConductCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [observation, setObservation] = useState('');
  const [savingConduct, setSavingConduct] = useState(false);
  
  // Selection dropdown state inside Modal
  const [codeDropdownOpen, setCodeDropdownOpen] = useState(false);

  useEffect(() => {
    fetchActiveClassAndCodes();
  }, []);

  const fetchActiveClassAndCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const [activeRes, codesRes] = await Promise.all([
        api.get('/teacher/active-class'),
        api.get('/teacher/conduct-codes')
      ]);
      
      setActiveClassData(activeRes.data);
      setConductCodes(codesRes.data);

      if (activeRes.data.claseActiva) {
        const mapped = activeRes.data.estudiantes.map(s => ({ ...s, status: 'present' }));
        setStudents(mapped);
      }
    } catch (error) {
      console.error(error);
      setError('Error al cargar la información de la clase.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id) => {
    const originalStatus = students.find(s => s.id === id)?.status;
    const newStatus = originalStatus === 'present' ? 'absent' : 'present';
    
    // Optimistic update
    setStudents(students.map(s => {
      if (s.id === id) {
        return { ...s, status: newStatus };
      }
      return s;
    }));
    
    setSavingAttendance(prev => new Set([...prev, id]));
    
    try {
await api.post('/teacher/attendance', { 
         attendances: [{
           student_id: id,
           subject_id: activeClassData.subject_id,
           status: newStatus,
           period: activeClassData.period || 1,
           date: new Date().toISOString()
         }]
       });
    } catch (error) {
      console.error(error);
      // Revert on error
      setStudents(students.map(s => {
        if (s.id === id) {
          return { ...s, status: originalStatus };
        }
        return s;
      }));
      Alert.alert('Error', 'No se pudo actualizar la asistencia');
    } finally {
      setSavingAttendance(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleOpenConductModal = (student) => {
    setSelectedStudent(student);
    setSelectedCode('');
    setObservation('');
    setConductModalVisible(true);
  };

  const handleSaveConductRecord = async () => {
    if (!selectedCode) {
      Alert.alert('Error', 'Selecciona un código de conducta.');
      return;
    }

    setSavingConduct(true);
    try {
await api.post('/teacher/conduct-records', {
         student_id: selectedStudent.id,
         code_id: selectedCode,
         observation: observation,
         period: activeClassData.period || 1
       });
      Alert.alert('Éxito', 'Código de conducta aplicado.');
      setConductModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el reporte de conducta.');
    } finally {
      setSavingConduct(false);
    }
  };

  const getConductCodeLabel = (id) => {
    const found = conductCodes.find(c => c.id === id);
    return found ? `${found.code} - ${found.name}` : 'Seleccionar Código';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Cargando clase activa...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.errorIconBox}>
          <ShieldAlert size={64} color={Colors.status.rejected} />
        </View>
        <Text style={styles.errorTitle}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchActiveClassAndCodes}>
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeClassData?.claseActiva) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBox}>
          <BookOpen size={64} color={Colors.gray[300]} />
        </View>
        <Text style={styles.emptyTitle}>No tienes clase activa en este momento</Text>
        {activeClassData?.proximaClase ? (
          <View style={styles.nextClassCard}>
            <Text style={styles.nextClassLabel}>Tu próxima clase es:</Text>
            <Text style={styles.nextClassName}>{activeClassData.proximaClase.materia}</Text>
            <Text style={styles.nextClassTime}>A las {activeClassData.proximaClase.start_time.substring(0, 5)} en {activeClassData.proximaClase.grade}º {activeClassData.proximaClase.section}</Text>
          </View>
        ) : (
          <Text style={styles.emptySubtitle}>{activeClassData?.mensaje || "No hay más clases programadas para hoy."}</Text>
        )}
        <TouchableOpacity style={styles.retryBtn} onPress={fetchActiveClassAndCodes}>
          <Text style={styles.retryBtnText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.classHeader}>
        <View style={styles.classHeaderRow}>
          <View style={styles.flex1}>
            <View style={styles.badgeRow}>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>CLASE ACTIVA</Text>
              </View>
            </View>
            <Text style={styles.headerClassName}>{activeClassData.materia}</Text>
            <View style={styles.headerInfoRow}>
              <View style={styles.headerInfoItem}>
                <Users size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.headerInfoText}>{activeClassData.grade}º {activeClassData.section}</Text>
              </View>
              <View style={styles.headerInfoItem}>
                <Clock size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.headerInfoText}>{activeClassData.start_time.substring(0, 5)} - {activeClassData.end_time.substring(0, 5)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.studentCard}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{item.full_name}</Text>
              <Text style={styles.studentCode}>{item.institutional_code}</Text>
            </View>
            
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.conductBtn}
                onPress={() => handleOpenConductModal(item)}
              >
                <ShieldAlert size={20} color={Colors.text.muted} />
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Switch
                  value={item.status === 'present'}
                  onValueChange={() => toggleStatus(item.id)}
                  trackColor={{ false: Colors.gray[300], true: Colors.status.approved }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={Colors.gray[300]}
                  disabled={savingAttendance.has(item.id)}
                />
                <Text style={[styles.switchLabel, item.status === 'present' ? styles.labelPresent : styles.labelAbsent]}>
                  {item.status === 'present' ? 'PRESENTE' : 'AUSENTE'}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={styles.emptyListText}>No hay estudiantes registrados en este grupo.</Text>
          </View>
        }
      />

      {/* Conduct Modal */}
      <Modal visible={conductModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Conducta</Text>
              <TouchableOpacity onPress={() => setConductModalVisible(false)} style={styles.closeHeaderBtn}>
                <X size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <Text style={styles.studentLabel}>
                Estudiante: <Text style={styles.studentNameHighlight}>{selectedStudent?.full_name}</Text>
              </Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Código de Conducta</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger} 
                  onPress={() => setCodeDropdownOpen(!codeDropdownOpen)}
                >
                  <Award size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    {getConductCodeLabel(selectedCode)}
                  </Text>
                  <ChevronDown size={18} color={Colors.text.muted} />
                </TouchableOpacity>

                {codeDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {conductCodes.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCode(c.id);
                          setCodeDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{c.code} - {c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Observaciones</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <FileText size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Detalles sobre el reporte de conducta..."
                    placeholderTextColor={Colors.text.muted}
                    multiline
                    numberOfLines={4}
                    value={observation}
                    onChangeText={setObservation}
                    style={[styles.input, styles.textArea]}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSaveConductRecord}
              disabled={savingConduct}
            >
              {savingConduct ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Aplicar Código</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, color: Colors.primary, fontWeight: Typography.weight.bold },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  emptyIconBox: { marginBottom: Spacing.xl, opacity: 0.3 },
  errorIconBox: { marginBottom: Spacing.xl },
  emptyTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary, textAlign: 'center', marginBottom: Spacing.lg },
  errorTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.status.rejected, textAlign: 'center', marginBottom: Spacing.lg },
  emptySubtitle: { fontSize: Typography.size.sm, color: Colors.text.muted, textAlign: 'center' },
  nextClassCard: {
    backgroundColor: Colors.card,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    width: '100%',
    marginTop: Spacing.xl,
    ...Shadows.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  nextClassLabel: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.muted, textTransform: 'uppercase', marginBottom: 8 },
  nextClassName: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary, marginBottom: 4 },
  nextClassTime: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  retryBtn: { marginTop: Spacing['2xl'], paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  retryBtnText: { color: Colors.text.inverse, fontWeight: Typography.weight.bold },
  
  // Class Header Styles
  classHeader: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 50,
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
    ...Shadows.elevated,
  },
  classHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  badgeRow: { marginBottom: 8 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(46, 204, 113, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.status.approved, marginRight: 6 },
  activeBadgeText: { fontSize: 10, fontWeight: '900', color: Colors.status.approved, letterSpacing: 0.5 },
  headerClassName: { fontSize: Typography.size['2xl'], fontWeight: Typography.weight.bold, color: Colors.text.inverse, marginBottom: 8 },
  headerInfoRow: { flexDirection: 'row', gap: 16 },
  headerInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerInfoText: { fontSize: Typography.size.sm, color: 'rgba(255,255,255,0.7)', fontWeight: Typography.weight.medium },
  
  // Student List Styles
  listContent: { padding: Spacing.lg, paddingBottom: 40 },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.primary, marginBottom: 2 },
  studentCode: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.muted, textTransform: 'uppercase' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  conductBtn: {
    padding: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  switchContainer: { alignItems: 'center', width: 60 },
  switchLabel: { fontSize: 8, fontWeight: '900', marginTop: 4 },
  labelPresent: { color: Colors.status.approved },
  labelAbsent: { color: Colors.status.rejected },
  emptyList: { alignItems: 'center', marginTop: 60 },
  emptyListText: { textAlign: 'center', color: Colors.text.muted, fontSize: Typography.size.sm },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.card, borderTopLeftRadius: BorderRadius['3xl'], borderTopRightRadius: BorderRadius['3xl'], maxHeight: '85%', padding: 24, ...Shadows.elevated },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.primary },
  closeHeaderBtn: { padding: 4 },
  modalForm: { flexGrow: 1 },
  studentLabel: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 20 },
  studentNameHighlight: { fontWeight: Typography.weight.bold, color: Colors.primary },
  formGroup: { marginBottom: Spacing.xl },
  label: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, color: Colors.text.muted, marginBottom: 8, textTransform: 'uppercase' },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray[50], borderRadius: BorderRadius.lg, paddingHorizontal: 16, height: 56, justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.gray[200] },
  dropdownTriggerText: { flex: 1, fontSize: Typography.size.md, color: Colors.text.primary },
  dropdownList: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, marginTop: 8, padding: 8, borderWidth: 1, borderColor: Colors.gray[200], maxHeight: 200, ...Shadows.card },
  dropdownItem: { paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] },
  dropdownItemText: { fontSize: Typography.size.md, color: Colors.text.primary },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gray[50], borderRadius: BorderRadius.lg, paddingHorizontal: 16, borderWidth: 1, borderColor: Colors.gray[200] },
  textAreaWrapper: { alignItems: 'flex-start', paddingVertical: 12 },
  inputIcon: { marginRight: 12, marginTop: 2 },
  input: { flex: 1, fontSize: Typography.size.md, color: Colors.text.primary },
  textArea: { textAlignVertical: 'top', height: 120 },
  submitBtn: { backgroundColor: Colors.primary, height: 56, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginTop: 20, ...Shadows.elevated },
  submitBtnText: { color: Colors.text.inverse, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
});
