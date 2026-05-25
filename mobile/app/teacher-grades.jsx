import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import api from '../src/utils/api';
import { Book, ChevronRight, FileText, CheckCircle, Trash2 } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function TeacherGradesScreen() {
  const [schedules, setSchedules] = useState([]);
  const [activities, setActivities] = useState([]);
  
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [students, setStudents] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchedulesAndActivities();
  }, []);

  const fetchSchedulesAndActivities = async () => {
    try {
      setLoading(true);
      const [schedRes, actRes] = await Promise.all([
        api.get('/teacher/schedule'),
        api.get('/teacher/activities')
      ]);
      const uniqueClasses = [];
      schedRes.data.forEach(s => {
        if (!uniqueClasses.find(c => c.subject_id === s.subject_id && c.grade === s.grade && c.section === s.section)) {
          uniqueClasses.push(s);
        }
      });
      setSchedules(uniqueClasses);
      setActivities(actRes.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar las clases o actividades.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (activity) => {
    setSelectedActivity(activity);
    setLoading(true);
    try {
      const response = await api.get('/teacher/grades-by-activity', {
        params: { 
          subject_id: selectedClass.subject_id, 
          activity_id: activity.id,
          period: selectedPeriod,
          grade: selectedClass.grade,
          section: selectedClass.section
        }
      });
      setStudents(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId, newValue) => {
    const val = newValue.replace(/[^0-9.]/g, ''); // Solo números y punto
    setStudents(students.map(s => 
      s.id === studentId ? { ...s, grade: val } : s
    ));
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      const grades = students.map(s => ({
        student_id: s.id,
        subject_id: selectedClass.subject_id,
        activity_id: selectedActivity.id,
        grade: parseFloat(s.grade) || 0
      }));
      await api.post('/teacher/grades', { grades, period: selectedPeriod });
      Alert.alert('Éxito', 'Notas guardadas correctamente');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron guardar las notas');
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (gradeId) => {
    Alert.alert(
      'Eliminar Nota',
      '¿Estás seguro de que deseas eliminar esta nota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/teacher/grades/${gradeId}`);
              setStudents(students.map(s => s.grade_id === gradeId ? { ...s, grade: 0, grade_id: null } : s));
              Alert.alert('Éxito', 'Nota eliminada correctamente');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo eliminar la nota');
            }
          }
        }
      ]
    );
  };

  const renderStudentItem = ({ item, index }) => (
    <View style={styles.studentCard}>
      <Text style={styles.studentIndex}>{index + 1}</Text>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.full_name}</Text>
        <Text style={styles.studentCode}>{item.institutional_code}</Text>
      </View>
      <TextInput
        style={styles.gradeInput}
        keyboardType="numeric"
        placeholder="0.00"
        value={item.grade !== undefined && item.grade !== null ? item.grade.toString() : ''}
        onChangeText={(val) => handleGradeChange(item.id, val)}
      />
      {item.grade_id && (
        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={() => deleteGrade(item.grade_id)}
        >
          <Trash2 size={18} color={Colors.status.absent} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderContent = () => {
    if (!selectedClass) {
      return (
        <FlatList
          data={schedules}
          keyExtractor={(item, idx) => `${item.subject_id}-${item.grade}-${item.section}-${idx}`}
          contentContainerStyle={styles.content}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Seleccione Clase</Text>}
          ListEmptyComponent={<Text style={styles.emptyText}>No tienes clases asignadas.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => setSelectedClass(item)}
            >
              <View style={styles.iconBox}>
                <Book size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.subjects?.name || 'Materia'}</Text>
                <Text style={styles.cardDesc}>{item.grade}º {item.section}</Text>
              </View>
              <ChevronRight size={24} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
        />
      );
    }

    if (!selectedActivity) {
      return (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View>
              <Text style={styles.sectionTitle}>{selectedClass.grade}º {selectedClass.section} - {selectedClass.subjects?.name}</Text>
              <Text style={styles.subTitle}>Seleccione la Actividad (Periodo {selectedPeriod})</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => loadStudents(item)}
            >
              <View style={styles.iconBox}>
                <FileText size={24} color={Colors.primary} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardDesc}>Ponderación: {item.percentage}%</Text>
              </View>
              <ChevronRight size={24} color={Colors.text.muted} />
            </TouchableOpacity>
          )}
        />
      );
    }

    return (
      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.sectionTitle}>{selectedActivity.name}</Text>
            <Text style={styles.subTitle}>Ingreso de Notas</Text>
            {loading && <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />}
          </View>
        }
        ListEmptyComponent={!loading && <Text style={styles.emptyText}>No hay estudiantes en esta clase.</Text>}
        ListFooterComponent={
          students.length > 0 && (
            <TouchableOpacity style={styles.saveBtn} onPress={saveChanges} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <>
                  <CheckCircle color={Colors.text.inverse} size={20} style={{ marginRight: 8 }} />
                  <Text style={styles.saveBtnText}>Guardar Notas</Text>
                </>
              )}
            </TouchableOpacity>
          )
        }
      />
    );
  };

  if (loading && schedules.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
<View style={styles.header}>
       {!selectedClass && (
          <View style={styles.periodTabs}>
            {[1, 2, 3, 4].map(p => (
              <TouchableOpacity 
                key={p} 
                onPress={() => setSelectedPeriod(p)}
                style={[styles.periodTab, selectedPeriod === p && styles.periodTabActive]}
              >
                <Text style={[styles.periodTabText, selectedPeriod === p && styles.periodTabTextActive]}>
                  P{p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 40,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    ...Shadows.elevated,
  },
  headerTitle: { color: Colors.text.inverse, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  periodTabs: {
    flexDirection: 'row',
    marginTop: -20,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    padding: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  periodTabActive: { backgroundColor: Colors.card },
  periodTabText: { color: 'rgba(255,255,255,0.7)', fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },
  periodTabTextActive: { color: Colors.primary },
  content: { padding: Spacing.xl },
  sectionTitle: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, color: Colors.primary, marginBottom: Spacing.lg },
  subTitle: { fontSize: Typography.size.sm, color: Colors.text.muted, marginBottom: Spacing.lg, marginTop: -Spacing.sm },
  emptyText: { textAlign: 'center', color: Colors.text.muted, marginTop: Spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary },
  cardDesc: { fontSize: Typography.size.sm, color: Colors.text.muted, marginTop: 4 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  studentIndex: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.muted, width: 24 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.primary },
  studentCode: { fontSize: Typography.size.xs, color: Colors.text.muted },
  gradeInput: {
    width: 60,
    height: 40,
    backgroundColor: Colors.gray[50],
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.primary,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  deleteBtn: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.status.approved,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
    ...Shadows.elevated,
  },
  saveBtnText: { color: Colors.text.inverse, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }
});

