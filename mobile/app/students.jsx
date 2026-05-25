import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
<<<<<<< HEAD
import { useRouter } from 'expo-router';
import api from '../src/utils/api';
import { Mail, Book, Search, User, ClipboardList, BookOpen, AlertCircle, Calendar, X } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
=======
import api from '../src/utils/api';
import { Mail, Book, User, Search } from 'lucide-react-native';
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

export default function StudentsScreen() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
<<<<<<< HEAD
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const router = useRouter();
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      const response = await api.get('/coordinator/students');
=======
      const response = await api.get('/admin/users', {
        params: { role: 'student' }
      });
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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

<<<<<<< HEAD
  const handleStudentPress = (student) => {
    setSelectedStudent(student);
    setActionSheetVisible(true);
  };

  const navigateTo = (route, params) => {
    setActionSheetVisible(false);
    router.push({ pathname: route, params });
  };

=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
<<<<<<< HEAD
          <Search size={20} color={Colors.text.muted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o carnet..."
            placeholderTextColor={Colors.text.muted}
=======
          <Search size={20} color="#8a8da0" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o carnet..."
            placeholderTextColor="#8a8da0"
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
<<<<<<< HEAD
          <ActivityIndicator size="large" color={Colors.primary} />
=======
          <ActivityIndicator size="large" color="#0B1956" />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
<<<<<<< HEAD
            <TouchableOpacity onPress={() => handleStudentPress(item)} style={styles.card} activeOpacity={0.7}>
=======
            <View style={styles.card}>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.full_name ? item.full_name.charAt(0).toUpperCase() : 'E'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.code}>{item.institutional_code || 'SIN CÓDIGO'}</Text>
                <View style={styles.detailRow}>
<<<<<<< HEAD
                  <Mail size={14} color={Colors.text.muted} style={styles.icon} />
=======
                  <Mail size={14} color="#8a8da0" style={styles.icon} />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  <Text style={styles.detailText}>{item.email}</Text>
                </View>
                {item.grade && (
                  <View style={styles.detailRow}>
<<<<<<< HEAD
                    <Book size={14} color={Colors.text.muted} style={styles.icon} />
                    <Text style={styles.detailText}>
                      {item.grade}º Grado - Sección '{item.section || 'A'}'
=======
                    <Book size={14} color="#8a8da0" style={styles.icon} />
                    <Text style={styles.detailText}>
                      {item.grade} - Sección '{item.section || 'A'}'
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                    </Text>
                  </View>
                )}
              </View>
<<<<<<< HEAD
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron estudiantes en tu nivel.</Text>
=======
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron estudiantes.</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            </View>
          }
        />
      )}
<<<<<<< HEAD

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
=======
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    </View>
  );
}

<<<<<<< HEAD
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 10,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
=======


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0B1956',
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
<<<<<<< HEAD
    borderRadius: BorderRadius.lg,
=======
    borderRadius: 14,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
<<<<<<< HEAD
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
=======
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#e6eaf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#0B1956' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#0B1956', marginBottom: 2 },
  code: { fontSize: 11, fontWeight: '800', color: '#8a8da0', letterSpacing: 0.5, marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  icon: { marginRight: 6 },
  detailText: { fontSize: 13, color: '#555' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8a8da0', fontSize: 14 }
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
});
