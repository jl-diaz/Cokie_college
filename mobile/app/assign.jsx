import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import api from '../src/utils/api';
import { ChevronDown, Calendar, Clock, BookOpen, User, Check } from 'lucide-react-native';

export default function AssignScreen() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selection states
  const [teacherModal, setTeacherModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [dayModal, setDayModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_id: '',
    grade: '',
    section: '',
    day_of_week: '1',
    start_time: '',
    end_time: ''
  });

  const days = [
    { label: 'Lunes', value: '1' },
    { label: 'Martes', value: '2' },
    { label: 'Miércoles', value: '3' },
    { label: 'Jueves', value: '4' },
    { label: 'Viernes', value: '5' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tchRes, subRes] = await Promise.all([
        api.get('/admin/users', { params: { role: 'teacher' } }),
        api.get('/admin/subjects')
      ]);
      setTeachers(tchRes.data);
      setSubjects(subRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los datos de docentes y materias.');
    } finally {
      setLoading(false);
    }
  };

  const getTeacherName = (id) => {
    const found = teachers.find(t => t.id === id);
    return found ? found.full_name : 'Selecciona un Docente';
  };

  const getSubjectName = (id) => {
    const found = subjects.find(s => s.id === id);
    return found ? found.name : 'Selecciona una Materia';
  };

  const getDayName = (val) => {
    const found = days.find(d => d.value === val);
    return found ? found.label : 'Lunes';
  };

  const handleSaveAssignment = async () => {
    if (!formData.teacher_id || !formData.subject_id || !formData.grade || !formData.section || !formData.start_time || !formData.end_time) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }

    // Basic time format check (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(formData.start_time) || !timeRegex.test(formData.end_time)) {
      Alert.alert('Error', 'La hora de inicio y fin deben estar en formato HH:MM (ej. 08:30 o 14:00)');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/admin/schedules', formData);
      Alert.alert('Éxito', 'Clase y horario asignados correctamente.');
      setFormData({
        teacher_id: '',
        subject_id: '',
        grade: '',
        section: '',
        day_of_week: '1',
        start_time: '',
        end_time: ''
      });
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || 'Error al asignar el horario';
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B1956" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalles de la Asignación</Text>

        {/* Teacher Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Docente</Text>
          <TouchableOpacity style={styles.selectTrigger} onPress={() => setTeacherModal(true)}>
            <User size={18} color="#8a8da0" style={styles.icon} />
            <Text style={[styles.selectText, formData.teacher_id ? styles.selectedText : null]}>
              {getTeacherName(formData.teacher_id)}
            </Text>
            <ChevronDown size={18} color="#8a8da0" />
          </TouchableOpacity>
        </View>

        {/* Subject Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Materia</Text>
          <TouchableOpacity style={styles.selectTrigger} onPress={() => setSubjectModal(true)}>
            <BookOpen size={18} color="#8a8da0" style={styles.icon} />
            <Text style={[styles.selectText, formData.subject_id ? styles.selectedText : null]}>
              {getSubjectName(formData.subject_id)}
            </Text>
            <ChevronDown size={18} color="#8a8da0" />
          </TouchableOpacity>
        </View>

        {/* Grade and Section */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>Grado</Text>
            <TextInput
              placeholder="Ej. Primaria 1"
              placeholderTextColor="#8a8da0"
              value={formData.grade}
              onChangeText={(v) => setFormData({ ...formData, grade: v })}
              style={styles.input}
            />
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Sección</Text>
            <TextInput
              placeholder="Ej. A"
              placeholderTextColor="#8a8da0"
              value={formData.section}
              onChangeText={(v) => setFormData({ ...formData, section: v })}
              style={styles.input}
            />
          </View>
        </View>

        {/* Day Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Día de la semana</Text>
          <TouchableOpacity style={styles.selectTrigger} onPress={() => setDayModal(true)}>
            <Calendar size={18} color="#8a8da0" style={styles.icon} />
            <Text style={styles.selectedText}>
              {getDayName(formData.day_of_week)}
            </Text>
            <ChevronDown size={18} color="#8a8da0" />
          </TouchableOpacity>
        </View>

        {/* Time Selectors */}
        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>Hora Inicio</Text>
            <View style={styles.inputWrapper}>
              <Clock size={16} color="#8a8da0" style={styles.icon} />
              <TextInput
                placeholder="07:30"
                placeholderTextColor="#8a8da0"
                value={formData.start_time}
                onChangeText={(v) => setFormData({ ...formData, start_time: v })}
                style={styles.timeInput}
              />
            </View>
          </View>

          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Hora Fin</Text>
            <View style={styles.inputWrapper}>
              <Clock size={16} color="#8a8da0" style={styles.icon} />
              <TextInput
                placeholder="09:00"
                placeholderTextColor="#8a8da0"
                value={formData.end_time}
                onChangeText={(v) => setFormData({ ...formData, end_time: v })}
                style={styles.timeInput}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.submitBtn} 
          onPress={handleSaveAssignment}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Asignar Horario</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Teacher Modal */}
      <Modal visible={teacherModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Docente</Text>
            <ScrollView style={styles.modalList}>
              {teachers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.listItem}
                  onPress={() => {
                    setFormData({ ...formData, teacher_id: t.id });
                    setTeacherModal(false);
                  }}
                >
                  <Text style={styles.listItemText}>{t.full_name}</Text>
                  {formData.teacher_id === t.id && <Check size={18} color="#0B1956" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setTeacherModal(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Subject Modal */}
      <Modal visible={subjectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Materia</Text>
            <ScrollView style={styles.modalList}>
              {subjects.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={styles.listItem}
                  onPress={() => {
                    setFormData({ ...formData, subject_id: s.id });
                    setSubjectModal(false);
                  }}
                >
                  <Text style={styles.listItemText}>{s.name}</Text>
                  {formData.subject_id === s.id && <Check size={18} color="#0B1956" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSubjectModal(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Day Modal */}
      <Modal visible={dayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Día</Text>
            <ScrollView style={styles.modalList}>
              {days.map(d => (
                <TouchableOpacity
                  key={d.value}
                  style={styles.listItem}
                  onPress={() => {
                    setFormData({ ...formData, day_of_week: d.value });
                    setDayModal(false);
                  }}
                >
                  <Text style={styles.listItemText}>{d.label}</Text>
                  {formData.day_of_week === d.value && <Check size={18} color="#0B1956" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDayModal(false)}>
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1956', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#8a8da0', marginBottom: 8, textTransform: 'uppercase' },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  selectText: { color: '#8a8da0', fontSize: 14, flex: 1 },
  selectedText: { color: '#333', fontSize: 14, flex: 1 },
  icon: { marginRight: 10 },
  row: { flexDirection: 'row' },
  input: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 12,
  },
  timeInput: { flex: 1, fontSize: 14, color: '#333' },
  submitBtn: {
    backgroundColor: '#0B1956',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  // Modals styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '70%',
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0B1956', marginBottom: 16, textAlign: 'center' },
  modalList: { flexGrow: 1, marginBottom: 16 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  listItemText: { fontSize: 15, color: '#333' },
  closeBtn: {
    backgroundColor: '#e6eaf5',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: { color: '#0B1956', fontWeight: 'bold', fontSize: 14 }
});
