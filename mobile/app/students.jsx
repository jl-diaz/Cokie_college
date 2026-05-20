import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../src/utils/api';
import { Mail, Book, User, Search } from 'lucide-react-native';

export default function StudentsScreen() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users', {
        params: { role: 'student' }
      });
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#8a8da0" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o carnet..."
            placeholderTextColor="#8a8da0"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0B1956" />
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.full_name ? item.full_name.charAt(0).toUpperCase() : 'E'}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.code}>{item.institutional_code || 'SIN CÓDIGO'}</Text>
                <View style={styles.detailRow}>
                  <Mail size={14} color="#8a8da0" style={styles.icon} />
                  <Text style={styles.detailText}>{item.email}</Text>
                </View>
                {item.grade && (
                  <View style={styles.detailRow}>
                    <Book size={14} color="#8a8da0" style={styles.icon} />
                    <Text style={styles.detailText}>
                      {item.grade} - Sección '{item.section || 'A'}'
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron estudiantes.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0B1956',
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
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
});
