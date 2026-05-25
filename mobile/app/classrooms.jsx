import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Calendar, ChevronRight, BookOpen, X } from 'lucide-react-native';
import api from '../src/utils/api';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function ClassroomsScreen() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const endpoint = profile?.role === 'coordinator' ? '/coordinator/classrooms' : '/teacher/classrooms';
      const response = await api.get(endpoint);
      setClassrooms(response.data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los salones.');
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomPress = (classroom) => {
    setSelectedClassroom(classroom);
    setActionSheetVisible(true);
  };

  const navigateToStudents = () => {
    setActionSheetVisible(false);
    router.push({ pathname: '/class', params: { grade: selectedClassroom.grade, section: selectedClassroom.section } });
  };

  const navigateToSchedule = () => {
    setActionSheetVisible(false);
    router.push({ pathname: '/schedule', params: { grade: selectedClassroom.grade, section: selectedClassroom.section } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Salones</Text>
        <Text style={styles.headerSubtitle}>Gestión de aulas y grupos</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {classrooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={Colors.gray[300]} style={{marginBottom: 16}} />
              <Text style={styles.emptyText}>No hay salones disponibles.</Text>
            </View>
          ) : (
            classrooms.map((cls, idx) => (
              <TouchableOpacity
                key={`${cls.grade}-${cls.section}-${idx}`}
                onPress={() => handleClassroomPress(cls)}
                style={styles.card}
                activeOpacity={0.8}
              >
                <View style={styles.cardInfo}>
                  <View style={styles.iconBox}>
                    <BookOpen color="#FFF" size={24} />
                  </View>
                  <View>
                    <Text style={styles.gradeText}>{cls.grade}º Grado</Text>
                    <Text style={styles.sectionText}>Sección {cls.section}</Text>
                  </View>
                </View>
                <ChevronRight color={Colors.gray[300]} size={24} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Action Sheet Modal */}
      {isActionSheetVisible && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setActionSheetVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedClassroom?.grade}º {selectedClassroom?.section}
              </Text>
              <TouchableOpacity onPress={() => setActionSheetVisible(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={navigateToStudents} style={styles.actionItem}>
              <View style={styles.actionIconBox}>
                <Users color="#FFF" size={20} />
              </View>
              <Text style={styles.actionText}>Ver Lista de Estudiantes</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToSchedule} style={styles.actionItem}>
              <View style={[styles.actionIconBox, { backgroundColor: Colors.primaryLight }]}>
                <Calendar color="#FFF" size={20} />
              </View>
              <Text style={styles.actionText}>Ver Horario de Clases</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: Spacing.xl },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.text.muted, textAlign: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  cardInfo: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { 
    width: 50, 
    height: 50, 
    borderRadius: BorderRadius.lg, 
    backgroundColor: Colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Spacing.lg 
  },
  gradeText: { fontSize: Typography.size.lg, fontWeight: 'bold', color: Colors.primary },
  sectionText: { fontSize: Typography.size.sm, color: Colors.text.muted, marginTop: 2 },
  
  // Modal Styles
  modalOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end', 
    zIndex: 1000 
  },
  modalBackdrop: { flex: 1 },
  modalContent: { 
    backgroundColor: Colors.card, 
    borderTopLeftRadius: BorderRadius['2xl'], 
    borderTopRightRadius: BorderRadius['2xl'], 
    padding: 24, 
    paddingBottom: 40 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.primary },
  actionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.background, 
    padding: 16, 
    borderRadius: BorderRadius.xl, 
    marginBottom: 12 
  },
  actionIconBox: { 
    backgroundColor: Colors.primary, 
    padding: 10, 
    borderRadius: BorderRadius.lg, 
    marginRight: 16 
  },
  actionText: { fontSize: Typography.size.md, fontWeight: 'bold', color: Colors.primary }
});
