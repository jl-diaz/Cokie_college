import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../src/utils/api';
import { Search, Plus, Trash2, Edit2, X, ChevronDown, User, Mail, Shield, Book } from 'lucide-react-native';

export default function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Dropdown states
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    first_surname: '',
    second_surname: '',
    email: '',
    role: 'student',
    grade: '',
    section: ''
  });

  const roles = [
    { label: 'Estudiante', value: 'student' },
    { label: 'Docente', value: 'teacher' },
    { label: 'Coordinador', value: 'coordinator' },
    { label: 'Super Admin', value: 'super_admin' }
  ];

  const roleFilterTabs = [
    { label: 'Todos', value: '' },
    { label: 'Estudiantes', value: 'student' },
    { label: 'Docentes', value: 'teacher' },
    { label: 'Coordinadores', value: 'coordinator' },
    { label: 'Admins', value: 'super_admin' }
  ];

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users', {
        params: roleFilter ? { role: roleFilter } : {}
      });
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      full_name: '',
      first_surname: '',
      second_surname: '',
      email: '',
      role: 'student',
      grade: '',
      section: ''
    });
    setModalVisible(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      first_surname: '',
      second_surname: '',
      email: user.email || '',
      role: user.role || 'student',
      grade: user.grade || '',
      section: user.section || ''
    });
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!formData.full_name || !formData.email) {
      Alert.alert('Error', 'Nombre Completo y Correo son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Edit Mode
        await api.put(`/admin/users/${editingUser.id}`, {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          grade: formData.role === 'student' ? formData.grade : '',
          section: formData.role === 'student' ? formData.section : ''
        });
        Alert.alert('Éxito', 'Usuario actualizado correctamente.');
      } else {
        // Create Mode
        await api.post('/admin/users', formData);
        Alert.alert('Éxito', 'Usuario creado exitosamente.');
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || 'Error al guardar usuario';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este usuario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${id}`);
              Alert.alert('Éxito', 'Usuario eliminado.');
              fetchUsers();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo eliminar el usuario.');
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.institutional_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin': return { bg: '#fee2e2', text: '#ef4444' };
      case 'coordinator': return { bg: '#ffedd5', text: '#f97316' };
      case 'teacher': return { bg: '#e0f2fe', text: '#0284c7' };
      default: return { bg: '#dcfce7', text: '#15803d' };
    }
  };

  const getRoleLabel = (role) => {
    const found = roles.find(r => r.value === role);
    return found ? found.label : role;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#8a8da0" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o código..."
            placeholderTextColor="#8a8da0"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
          />
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabsContainer}
        >
          {roleFilterTabs.map(tab => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.tabBtn, roleFilter === tab.value && styles.tabBtnActive]}
              onPress={() => setRoleFilter(tab.value)}
            >
              <Text style={[styles.tabBtnText, roleFilter === tab.value && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0B1956" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const badge = getRoleBadgeColor(item.role);
            return (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.userName}>{item.full_name}</Text>
                  <Text style={styles.userCode}>{item.institutional_code || 'S/C'}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                        {getRoleLabel(item.role)}
                      </Text>
                    </View>
                    {item.role === 'student' && (item.grade || item.section) && (
                      <View style={styles.classBadge}>
                        <Text style={styles.classBadgeText}>
                          {item.grade} '{item.section}'
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.actionBtn}>
                    <Edit2 size={18} color="#0B1956" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteUser(item.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron usuarios.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleOpenCreateModal}>
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#0B1956" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombres</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color="#8a8da0" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Ej. Jonathan"
                    value={formData.full_name}
                    onChangeText={(v) => setFormData({ ...formData, full_name: v })}
                    style={styles.input}
                  />
                </View>
              </View>

              {!editingUser && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Primer Apellido</Text>
                    <View style={styles.inputWrapper}>
                      <User size={18} color="#8a8da0" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Ej. Diaz"
                        value={formData.first_surname}
                        onChangeText={(v) => setFormData({ ...formData, first_surname: v })}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Segundo Apellido</Text>
                    <View style={styles.inputWrapper}>
                      <User size={18} color="#8a8da0" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Ej. Alvarez"
                        value={formData.second_surname}
                        onChangeText={(v) => setFormData({ ...formData, second_surname: v })}
                        style={styles.input}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Correo Institucional</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color="#8a8da0" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Ej. jdiaz@cokiecollege.edu"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={formData.email}
                    onChangeText={(v) => setFormData({ ...formData, email: v })}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Rol</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger} 
                  onPress={() => setRoleDropdownOpen(!roleDropdownOpen)}
                >
                  <Shield size={18} color="#8a8da0" style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText}>
                    {getRoleLabel(formData.role)}
                  </Text>
                  <ChevronDown size={18} color="#8a8da0" />
                </TouchableOpacity>

                {roleDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {roles.map(r => (
                      <TouchableOpacity
                        key={r.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, role: r.value });
                          setRoleDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{r.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {formData.role === 'student' && (
                <View style={styles.row}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                    <Text style={styles.label}>Grado</Text>
                    <View style={styles.inputWrapper}>
                      <Book size={18} color="#8a8da0" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Ej. Primaria 1"
                        value={formData.grade}
                        onChangeText={(v) => setFormData({ ...formData, grade: v })}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Sección</Text>
                    <View style={styles.inputWrapper}>
                      <Book size={18} color="#8a8da0" style={styles.inputIcon} />
                      <TextInput
                        placeholder="Ej. A"
                        value={formData.section}
                        onChangeText={(v) => setFormData({ ...formData, section: v })}
                        style={styles.input}
                      />
                    </View>
                  </View>
                </View>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSaveUser}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </Text>
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
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  tabsScroll: {
    marginHorizontal: -20,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: '#FFF',
  },
  tabBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tabBtnTextActive: {
    color: '#0B1956',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, pb: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#0B1956', marginBottom: 2 },
  userCode: { fontSize: 11, fontWeight: '700', color: '#8a8da0', textTransform: 'uppercase', marginBottom: 4 },
  userEmail: { fontSize: 13, color: '#555', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: { fontSize: 11, fontWeight: 'bold' },
  classBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  cardActions: { justifyContent: 'space-around', alignItems: 'center', paddingLeft: 12 },
  actionBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  deleteBtn: { backgroundColor: '#fee2e2', marginTop: 8 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8a8da0', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0b1956',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0b1956',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0B1956' },
  closeBtn: { padding: 4 },
  modalForm: { flexGrow: 1 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#8a8da0', marginBottom: 8, textTransform: 'uppercase' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#333' },
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
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  dropdownItemText: { fontSize: 14, color: '#333' },
  row: { flexDirection: 'row' },
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
