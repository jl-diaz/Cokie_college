import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import api from '../src/utils/api';
import { BookOpen, Check, X, ShieldAlert, Award, FileText, ChevronDown } from 'lucide-react-native';

export default function ClassScreen() {
  const [schedules, setSchedules] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConduct, setSavingConduct] = useState(false);

  // Conduct codes modal
  const [conductModalVisible, setConductModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [conductCodes, setConductCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [observation, setObservation] = useState('');
  
  // Selection dropdown state inside Modal
  const [codeDropdownOpen, setCodeDropdownOpen] = useState(false);

  useEffect(() => {
    fetchSchedulesAndCodes();
  }, []);

  const fetchSchedulesAndCodes = async () => {
    setLoading(true);
    try {
      const [schedRes, codesRes] = await Promise.all([
        api.get('/teacher/schedule'),
        api.get('/teacher/conduct-codes')
      ]);
      
      // Deduplicate schedules to get unique classes taught
      const uniqueClasses = [];
      schedRes.data.forEach(s => {
        if (!uniqueClasses.find(c => c.subject_id === s.subject_id && c.grade === s.grade && c.section === s.section)) {
          uniqueClasses.push(s);
        }
      });
      setSchedules(uniqueClasses);
      setConductCodes(codesRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las clases o códigos de conducta.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClass = async (cls) => {
    setSelectedClass(cls);
    setLoading(true);
    try {
      const response = await api.get('/teacher/class-students', {
        params: { grade: cls.grade, section: cls.section }
      });
      const mapped = response.data.map(s => ({ ...s, status: 'present' }));
      setStudents(mapped);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los alumnos de la clase.');
      setSelectedClass(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = (id) => {
    setStudents(students.map(s => {
      if (s.id === id) {
        return { ...s, status: s.status === 'present' ? 'absent' : 'present' };
      }
      return s;
    }));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) return;
    setSaving(true);
    try {
      const attendances = students.map(s => ({
        student_id: s.id,
        subject_id: selectedClass.subject_id,
        status: s.status,
        period: 1,
        date: new Date().toISOString()
      }));
      await api.post('/teacher/attendance', { attendances });
      Alert.alert('Éxito', 'Asistencia guardada correctamente.');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar la asistencia.');
    } finally {
      setSaving(false);
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
        period: 1
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

  if (loading && !selectedClass && schedules.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B1956" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!selectedClass ? (
        // Schedule / Class list view
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Selecciona una Clase Activa</Text>
          {schedules.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No tienes clases asignadas.</Text>
            </View>
          ) : (
            schedules.map((cls, idx) => (
              <TouchableOpacity
                key={cls.id || idx}
                style={styles.classCard}
                onPress={() => handleSelectClass(cls)}
                activeOpacity={0.8}
              >
                <View style={styles.classIconBox}>
                  <BookOpen size={24} color="#0B1956" />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{cls.subjects?.name || 'Materia'}</Text>
                  <Text style={styles.classDetail}>{cls.grade} - Sección '{cls.section}'</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      ) : (
        // Students List and Attendance View
        <View style={styles.flex1}>
          <View style={styles.classHeader}>
            <View style={styles.classHeaderRow}>
              <View style={styles.flex1}>
                <Text style={styles.headerClassName}>{selectedClass.subjects?.name || 'Materia'}</Text>
                <Text style={styles.headerClassDetail}>{selectedClass.grade} - Sección '{selectedClass.section}'</Text>
              </View>
              <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedClass(null)}>
                <Text style={styles.backBtnText}>Cambiar clase</Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#0B1956" />
            </View>
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.studentsList}
              renderItem={({ item }) => (
                <View style={styles.studentCard}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{item.full_name}</Text>
                    <Text style={styles.studentCode}>{item.institutional_code || 'S/C'}</Text>
                  </View>
                  <View style={styles.studentActions}>
                    <TouchableOpacity 
                      style={[styles.statusBtn, item.status === 'present' ? styles.presentBtn : styles.absentBtn]}
                      onPress={() => toggleStatus(item.id)}
                    >
                      <Text style={[styles.statusBtnText, item.status === 'present' ? styles.presentBtnText : styles.absentBtnText]}>
                        {item.status === 'present' ? 'Asiste' : 'Falta'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.conductBtn}
                      onPress={() => handleOpenConductModal(item)}
                    >
                      <ShieldAlert size={18} color="#f59e0b" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No hay estudiantes registrados en este curso.</Text>
                </View>
              }
            />
          )}

          {students.length > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSaveAttendance}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Guardar Asistencia</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Conduct Modal */}
      <Modal visible={conductModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Conducta</Text>
              <TouchableOpacity onPress={() => setConductModalVisible(false)} style={styles.closeHeaderBtn}>
                <X size={22} color="#0B1956" />
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
                  <Award size={18} color="#8a8da0" style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                    {getConductCodeLabel(selectedCode)}
                  </Text>
                  <ChevronDown size={18} color="#8a8da0" />
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
                  <FileText size={18} color="#8a8da0" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Detalles sobre el reporte de conducta..."
                    placeholderTextColor="#8a8da0"
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
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  flex1: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0B1956', marginBottom: 20 },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  classIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#e6eaf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  classInfo: { flex: 1 },
  className: { fontSize: 16, fontWeight: 'bold', color: '#0B1956', marginBottom: 2 },
  classDetail: { fontSize: 13, color: '#8a8da0' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8a8da0', textAlign: 'center' },
  
  // Class Header Styles
  classHeader: {
    backgroundColor: '#0B1956',
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  classHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerClassName: { fontSize: 18, fontWeight: 'bold', color: '#FFF', marginBottom: 2 },
  headerClassDetail: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  
  // Student List Styles
  studentsList: { padding: 16, pb: 100 },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 2 },
  studentCode: { fontSize: 11, fontWeight: '700', color: '#8a8da0', textTransform: 'uppercase' },
  studentActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  presentBtn: { backgroundColor: '#e8f5e9' },
  absentBtn: { backgroundColor: '#ffebee' },
  statusBtnText: { fontSize: 13, fontWeight: '800' },
  presentBtnText: { color: '#2e7d32' },
  absentBtnText: { color: '#c62828' },
  conductBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  saveBtn: {
    backgroundColor: '#0B1956',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1956' },
  closeHeaderBtn: { padding: 4 },
  modalForm: { flexGrow: 1 },
  studentLabel: { fontSize: 14, color: '#666', marginBottom: 20 },
  studentNameHighlight: { fontWeight: 'bold', color: '#0B1956' },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#8a8da0', marginBottom: 8, textTransform: 'uppercase' },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
    justifyContent: 'space-between',
  },
  dropdownTriggerText: { flex: 1, fontSize: 14, color: '#333' },
  dropdownList: {
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    marginTop: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: 150,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 100,
    paddingVertical: 10,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#333' },
  textArea: {
    textAlignVertical: 'top',
    height: '100%',
  },
  submitBtn: {
    backgroundColor: '#0B1956',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
