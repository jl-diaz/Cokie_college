import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../src/utils/api';
import { Search, Plus, Trash2, Edit2, X, ChevronDown, User, Mail, Shield, Book } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

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
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    first_surname: '',
    second_surname: '',
    email: '',
    role: 'student',
    grade: '',
    section: '',
    level: ''
  });

  const roles = [
    { label: 'Estudiante', value: 'student' },
    { label: 'Docente', value: 'teacher' },
    { label: 'Coordinador', value: 'coordinator' },
    { label: 'Super Admin', value: 'super_admin' }
  ];

  const levels = [
    { label: 'Primaria', value: 'Primaria' },
    { label: 'Tercer Ciclo', value: 'Tercer Ciclo' }
  ];

  const grades = [
    { label: '2º Grado', value: '2' },
    { label: '3º Grado', value: '3' },
    { label: '4º Grado', value: '4' },
    { label: '5º Grado', value: '5' },
    { label: '6º Grado', value: '6' },
    { label: '7º Grado', value: '7' },
    { label: '8º Grado', value: '8' },
    { label: '9º Grado', value: '9' }
  ];

  const sections = [
    { label: 'Sección A', value: 'A' },
    { label: 'Sección B', value: 'B' },
    { label: 'Sección C', value: 'C' }
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
      section: '',
      level: ''
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
      section: user.section || '',
      level: user.level || ''
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
          section: formData.role === 'student' ? formData.section : '',
          level: (formData.role === 'coordinator' || formData.role === 'teacher') ? formData.level : ''
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

  const getLevelLabel = (level) => {
    const found = levels.find(l => l.value === level);
    return found ? found.label : (level || 'Seleccionar Nivel');
  };

  const getGradeLabel = (grade) => {
    const found = grades.find(g => g.value === grade);
    return found ? found.label : (grade || 'Seleccionar Grado');
  };

  const getSectionLabel = (section) => {
    const found = sections.find(s => s.value === section);
    return found ? found.label : (section || 'Seleccionar Sección');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.muted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o código..."
            placeholderTextColor={Colors.text.muted}
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
          <ActivityIndicator size="large" color={Colors.primary} />
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
                    <Edit2 size={18} color={Colors.primary} />
                  </TouchableOpacity>

                  {!(item.role === 'super_admin') && (
                    <TouchableOpacity onPress={() => handleDeleteUser(item.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                      <Trash2 size={18} color={Colors.status.rejected} />
                    </TouchableOpacity>
                  )}

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
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{editingUser ? 'Nombre Completo' : 'Nombres'}</Text>
                <View style={styles.inputWrapper}>
                  <User size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Ej. Jonathan"
                    placeholderTextColor={Colors.text.muted}
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
                      <User size={18} color={Colors.text.muted} style={styles.inputIcon} />
                      <TextInput
                        placeholder="Ej. Diaz"
                        placeholderTextColor={Colors.text.muted}
                        value={formData.first_surname}
                        onChangeText={(v) => setFormData({ ...formData, first_surname: v })}
                        style={styles.input}
                      />
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Segundo Apellido</Text>
                    <View style={styles.inputWrapper}>
                      <User size={18} color={Colors.text.muted} style={styles.inputIcon} />
                      <TextInput
                        placeholder="Ej. Alvarez"
                        placeholderTextColor={Colors.text.muted}
                        value={formData.second_surname}
                        onChangeText={(v) => setFormData({ ...formData, second_surname: v })}
                        style={styles.input}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Correo</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Ej. jdiaz@cokiecollege.edu"
                    placeholderTextColor={Colors.text.muted}
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
                  <Shield size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText}>
                    {getRoleLabel(formData.role)}
                  </Text>
                  <ChevronDown size={18} color={Colors.text.muted} />
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

              {(formData.role === 'coordinator' || formData.role === 'teacher') && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Nivel</Text>
                  <TouchableOpacity 
                    style={styles.dropdownTrigger} 
                    onPress={() => setLevelDropdownOpen(!levelDropdownOpen)}
                  >
                    <Shield size={18} color={Colors.text.muted} style={styles.inputIcon} />
                    <Text style={styles.dropdownTriggerText}>
                      {getLevelLabel(formData.level)}
                    </Text>
                    <ChevronDown size={18} color={Colors.text.muted} />
                  </TouchableOpacity>

                  {levelDropdownOpen && (
                    <View style={styles.dropdownList}>
                      {levels.map(l => (
                        <TouchableOpacity
                          key={l.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({ ...formData, level: l.value });
                            setLevelDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{l.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {formData.role === 'student' && (
                <View style={styles.row}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                    <Text style={styles.label}>Grado</Text>
                    <TouchableOpacity 
                      style={styles.dropdownTrigger} 
                      onPress={() => setGradeDropdownOpen(!gradeDropdownOpen)}
                    >
                      <Book size={18} color={Colors.text.muted} style={styles.inputIcon} />
                      <Text style={styles.dropdownTriggerText}>
                        {getGradeLabel(formData.grade)}
                      </Text>
                      <ChevronDown size={18} color={Colors.text.muted} />
                    </TouchableOpacity>

                    {gradeDropdownOpen && (
                      <View style={styles.dropdownList}>
                        {grades.map(g => (
                          <TouchableOpacity
                            key={g.value}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData({ ...formData, grade: g.value });
                              setGradeDropdownOpen(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{g.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Sección</Text>
                    <TouchableOpacity 
                      style={styles.dropdownTrigger} 
                      onPress={() => setSectionDropdownOpen(!sectionDropdownOpen)}
                    >
                      <Book size={18} color={Colors.text.muted} style={styles.inputIcon} />
                      <Text style={styles.dropdownTriggerText}>
                        {getSectionLabel(formData.section)}
                      </Text>
                      <ChevronDown size={18} color={Colors.text.muted} />
                    </TouchableOpacity>

                    {sectionDropdownOpen && (
                      <View style={styles.dropdownList}>
                        {sections.map(s => (
                          <TouchableOpacity
                            key={s.value}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData({ ...formData, section: s.value });
                              setSectionDropdownOpen(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{s.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
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
    marginBottom: 16,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },
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
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabBtnActive: {
    backgroundColor: '#FFF',
  },
  tabBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 'bold',
    fontSize: Typography.size.xs,
  },
  tabBtnTextActive: {
    color: Colors.primary,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: Spacing.xl, pb: 100 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardInfo: { flex: 1 },
  userName: { fontSize: Typography.size.md, fontWeight: 'bold', color: Colors.primary, marginBottom: 2 },
  userCode: { fontSize: Typography.size.xs, fontWeight: '700', color: Colors.text.muted, textTransform: 'uppercase', marginBottom: 4 },
  userEmail: { fontSize: Typography.size.sm, color: Colors.text.secondary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  roleBadgeText: { fontSize: Typography.size.xs - 1, fontWeight: 'bold' },
  classBadge: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  classBadgeText: { fontSize: Typography.size.xs - 1, fontWeight: 'bold', color: Colors.text.muted },
  cardActions: { justifyContent: 'space-around', alignItems: 'center', paddingLeft: 12 },
  actionBtn: { padding: 8, borderRadius: BorderRadius.sm, backgroundColor: Colors.gray[100] },
  deleteBtn: { backgroundColor: '#fee2e2', marginTop: 8 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.sm },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.elevated,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.primary },
  closeBtn: { padding: 4 },
  modalForm: { flexGrow: 1 },
  formGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.size.xs, fontWeight: '700', color: Colors.text.muted, marginBottom: 8, textTransform: 'uppercase' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    height: 50,
    justifyContent: 'space-between',
  },
  dropdownTriggerText: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },
  dropdownList: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginTop: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] },
  dropdownItemText: { fontSize: Typography.size.sm, color: Colors.text.primary },
  row: { flexDirection: 'row' },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#FFF', fontSize: Typography.size.md, fontWeight: 'bold' }
});
