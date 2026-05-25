import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import api from '../src/utils/api';
import { ChevronDown, Calendar, Clock, BookOpen, User, Check, Hash, X } from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function AssignScreen() {
  const { profile } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selection states
  const [teacherModal, setTeacherModal] = useState(false);
  const [subjectModal, setSubjectModal] = useState(false);
  const [dayModal, setDayModal] = useState(false);
  const [gradeModal, setGradeModal] = useState(false);
  const [sectionModal, setSectionModal] = useState(false);
  const [timeModalType, setTimeModalType] = useState(null); // 'start' or 'end'

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

  const SECTIONS = ['A', 'B', 'C'];
  
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 7; h <= 18; h++) {
      const hour = h.toString().padStart(2, '0');
      slots.push(`${hour}:00`);
      slots.push(`${hour}:30`);
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();

  const getAvailableGrades = () => {
    const level = profile?.level || '';
    if (level === 'Primaria') return ['1', '2', '3', '4', '5', '6'];
    if (level === 'Secundaria' || level === 'Tercer Ciclo') return ['7', '8', '9'];
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  };

  const availableGrades = getAvailableGrades();

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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Asignar Horario</Text>
        <Text style={styles.headerSubtitle}>Configura clases y horarios</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detalles de la Asignación</Text>

          {/* Teacher Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Docente</Text>
            <TouchableOpacity style={styles.selectTrigger} onPress={() => setTeacherModal(true)}>
              <User size={18} color={Colors.text.muted} style={styles.icon} />
              <Text style={[styles.selectText, formData.teacher_id ? styles.selectedText : null]}>
                {getTeacherName(formData.teacher_id)}
              </Text>
              <ChevronDown size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Subject Selection */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Materia</Text>
            <TouchableOpacity style={styles.selectTrigger} onPress={() => setSubjectModal(true)}>
              <BookOpen size={18} color={Colors.text.muted} style={styles.icon} />
              <Text style={[styles.selectText, formData.subject_id ? styles.selectedText : null]}>
                {getSubjectName(formData.subject_id)}
              </Text>
              <ChevronDown size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Grade and Section */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Grado</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => setGradeModal(true)}>
                <Hash size={16} color={Colors.text.muted} style={styles.icon} />
                <Text style={[styles.selectText, formData.grade ? styles.selectedText : null]}>
                  {formData.grade || 'Grado'}
                </Text>
                <ChevronDown size={18} color={Colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Sección</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => setSectionModal(true)}>
                <Text style={[styles.selectText, formData.section ? styles.selectedText : null, { paddingLeft: 8 }]}>
                  {formData.section || 'Sección'}
                </Text>
                <ChevronDown size={18} color={Colors.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Day Selector */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Día de la semana</Text>
            <TouchableOpacity style={styles.selectTrigger} onPress={() => setDayModal(true)}>
              <Calendar size={18} color={Colors.text.muted} style={styles.icon} />
              <Text style={styles.selectedText}>
                {getDayName(formData.day_of_week)}
              </Text>
              <ChevronDown size={18} color={Colors.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Time Selectors */}
          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Hora Inicio</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => setTimeModalType('start')}>
                <Clock size={16} color={Colors.text.muted} style={styles.icon} />
                <Text style={[styles.selectText, formData.start_time ? styles.selectedText : null]}>
                  {formData.start_time || '07:00'}
                </Text>
                <ChevronDown size={18} color={Colors.text.muted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Hora Fin</Text>
              <TouchableOpacity style={styles.selectTrigger} onPress={() => setTimeModalType('end')}>
                <Clock size={16} color={Colors.text.muted} style={styles.icon} />
                <Text style={[styles.selectText, formData.end_time ? styles.selectedText : null]}>
                  {formData.end_time || '07:45'}
                </Text>
                <ChevronDown size={18} color={Colors.text.muted} />
              </TouchableOpacity>
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
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Teacher Modal */}
      <Modal visible={teacherModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Docente</Text>
              <TouchableOpacity onPress={() => setTeacherModal(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
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
                  {formData.teacher_id === t.id && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subject Modal */}
      <Modal visible={subjectModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Materia</Text>
              <TouchableOpacity onPress={() => setSubjectModal(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
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
                  {formData.subject_id === s.id && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Day Modal */}
      <Modal visible={dayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Día</Text>
              <TouchableOpacity onPress={() => setDayModal(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
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
                  {formData.day_of_week === d.value && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Grade Modal */}
      <Modal visible={gradeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Grado</Text>
              <TouchableOpacity onPress={() => setGradeModal(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {availableGrades.map(g => (
                <TouchableOpacity
                  key={g}
                  style={styles.listItem}
                  onPress={() => {
                    setFormData({ ...formData, grade: g });
                    setGradeModal(false);
                  }}
                >
                  <Text style={styles.listItemText}>{g}º Grado</Text>
                  {formData.grade === g && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Section Modal */}
      <Modal visible={sectionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Sección</Text>
              <TouchableOpacity onPress={() => setSectionModal(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {SECTIONS.map(s => (
                <TouchableOpacity
                  key={s}
                  style={styles.listItem}
                  onPress={() => {
                    setFormData({ ...formData, section: s });
                    setSectionModal(false);
                  }}
                >
                  <Text style={styles.listItemText}>Sección {s}</Text>
                  {formData.section === s && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Time Modal */}
      <Modal visible={!!timeModalType} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {timeModalType === 'start' ? 'Hora Inicio' : 'Hora Fin'}
              </Text>
              <TouchableOpacity onPress={() => setTimeModalType(null)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {timeSlots.map(t => (
                <TouchableOpacity
                  key={t}
                  style={styles.listItem}
                  onPress={() => {
                    if (timeModalType === 'start') {
                      setFormData({ ...formData, start_time: t });
                    } else {
                      setFormData({ ...formData, end_time: t });
                    }
                    setTimeModalType(null);
                  }}
                >
                  <Text style={styles.listItemText}>{t}</Text>
                  {((timeModalType === 'start' && formData.start_time === t) || (timeModalType === 'end' && formData.end_time === t)) && <Check size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 10,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  headerTitle: { color: '#FFF', fontSize: Typography.size.xl, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.sm, marginTop: 4 },
  content: { flex: 1 },
  scrollContent: { padding: Spacing.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    ...Shadows.card,
  },
  cardTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: Colors.primary, marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: Typography.size.xs, fontWeight: '700', color: Colors.text.muted, marginBottom: 8, textTransform: 'uppercase' },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.gray[100],
  },
  selectText: { color: Colors.text.muted, fontSize: Typography.size.sm, flex: 1 },
  selectedText: { color: Colors.text.primary, fontSize: Typography.size.sm, flex: 1, fontWeight: '500' },
  icon: { marginRight: 10 },
  row: { flexDirection: 'row' },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    ...Shadows.elevated,
  },
  submitBtnText: { color: '#FFF', fontSize: Typography.size.md, fontWeight: 'bold' },
  
  // Modals styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '75%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: 'bold', color: Colors.primary },
  modalList: { flexGrow: 1, marginBottom: 16 },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  listItemText: { fontSize: Typography.size.md, color: Colors.text.primary }
});
