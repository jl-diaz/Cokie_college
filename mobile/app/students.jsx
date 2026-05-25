import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { Mail, Book, Search, User, ClipboardList, BookOpen, AlertCircle, Calendar, X } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function StudentsScreen() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/coordinator/students');
      setStudents(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo cargar el listado de estudiantes.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setActionSheetVisible(true);
  };

  const navigateTo = (route, params) => {
    setActionSheetVisible(false);
    router.push({ pathname: route, params });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.muted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o carnet..."
            placeholderTextColor={Colors.text.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleStudentPress(item)} style={styles.card} activeOpacity={0.7}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.full_name ? item.full_name.charAt(0).toUpperCase() : 'E'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.code}>{item.institutional_code || 'SIN CÓDIGO'}</Text>
                <View style={styles.detailRow}>
                  <Mail size={14} color={Colors.text.muted} style={styles.icon} />
                  <Text style={styles.detailText}>{item.email}</Text>
                </View>
                {item.grade && (
                  <View style={styles.detailRow}>
                    <Book size={14} color={Colors.text.muted} style={styles.icon} />
                    <Text style={styles.detailText}>
                      {item.grade}º Grado - Sección '{item.section || 'A'}'
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron estudiantes en tu nivel.</Text>
            </View>
          }
        />
      )}

      {isActionSheetVisible && (
        <View style={styles.actionSheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setActionSheetVisible(false)} />
          <View style={styles.actionSheetContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.actionSheetTitle}>{selectedStudent?.full_name}</Text>
                <Text style={styles.actionSheetSubtitle}>{selectedStudent?.institutional_code}</Text>
              </View>
              <TouchableOpacity onPress={() => setActionSheetVisible(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              onPress={() => navigateTo('/schedule', { student_id: selectedStudent?.id, student_name: selectedStudent?.full_name, isCoordinatorView: 'true' })}
              style={styles.actionButton}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
                <Calendar color="#FFF" size={20} />
              </View>
              <Text style={styles.actionText}>Ver Horario de Clases</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigateTo('/diary', { studentId: selectedStudent?.id, isCoordinatorView: 'true' })}
              style={styles.actionButton}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
                <ClipboardList color="#FFF" size={20} />
              </View>
              <Text style={styles.actionText}>Ver Diario Pedagógico</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => navigateTo('/grades', { studentId: selectedStudent?.id, isCoordinatorView: 'true' })}
              style={styles.actionButton}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.status.approved }]}>
                <BookOpen color="#FFF" size={20} />
              </View>
              <Text style={styles.actionText}>Ver Notas del Estudiante</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.xl },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.primary },
  info: { flex: 1 },
  name: { fontSize: Typography.size.md, fontWeight: 'bold', color: Colors.primary, marginBottom: 2 },
  code: { fontSize: Typography.size.xs, fontWeight: 'bold', color: Colors.text.muted, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { marginRight: 6 },
  detailText: { fontSize: Typography.size.sm, color: Colors.text.secondary },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.sm },
  
  actionSheetOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000
  },
  actionSheetContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['3xl'],
    borderTopRightRadius: BorderRadius['3xl'],
    padding: 24,
    paddingBottom: 40
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  actionSheetTitle: {
    fontSize: Typography.size.xl,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  actionSheetSubtitle: {
    fontSize: Typography.size.sm,
    color: Colors.text.muted,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: BorderRadius.xl,
    marginBottom: 12
  },
  actionIcon: {
    padding: 10,
    borderRadius: BorderRadius.lg,
    marginRight: 16
  },
  actionText: {
    fontSize: Typography.size.md,
    fontWeight: 'bold',
    color: Colors.primary
  }
});
