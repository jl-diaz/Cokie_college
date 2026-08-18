import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import api from '../src/utils/api';
import { Search, Plus, Trash2, Edit2, X, ChevronDown, User, Mail, Shield, Book, CheckCircle2 } from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../src/context/AuthContext';
import PageHeader from '../src/components/PageHeader';

import { useAlert } from '../src/context/AlertContext';

export default function UsersScreen() {
  const { t } = useTranslation();
  const { colors: Colors } = useTheme();
  const { profile: currentProfile } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Dropdown states
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [levelDropdownOpen, setLevelDropdownOpen] = useState(false);
  const [gradeDropdownOpen, setGradeDropdownOpen] = useState(false);
  const [sectionDropdownOpen, setSectionDropdownOpen] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    first_surname: '',
    second_surname: '',
    email: '',
    role: 'student',
    grade: '',
    section: '',
    level: '',
    materia_principal: ''
  });

  const roles = [
    { label: t('users.tabStudents', 'Estudiante'), value: 'student' },
    { label: t('users.tabTeachers', 'Docente'), value: 'teacher' },
    { label: t('users.tabCoordinators', 'Coordinador'), value: 'coordinator' },
    { label: t('users.tabAdmins', 'Super Admin'), value: 'super_admin' },
    { label: t('users.tabCafetin', 'Cafetín'), value: 'cafetin' }
  ];

  const levels = [
    { label: 'Primaria', value: 'Primaria' },
    { label: 'Tercer Ciclo', value: 'Tercer Ciclo' }
  ];

  const [grades] = useState([...Array(9)].map((_, i) => ({ label: `${i + 1}º Grado`, value: i + 1 })));
  const [sections] = useState(['A', 'B', 'C'].map(s => ({ label: `Sección '${s}'`, value: s })));
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/admin/subjects');
      setSubjects(res.data.map(s => ({ label: s.name, value: s.id })));
    } catch (error) {
      console.error('Error fetching subjects', error);
    }
  };

  const roleFilterTabs = [
    { label: t('users.tabAll', 'Todos'), value: '' },
    { label: t('users.tabStudents', 'Estudiantes'), value: 'student' },
    { label: t('users.tabTeachers', 'Docentes'), value: 'teacher' },
    { label: t('users.tabCoordinators', 'Coordinadores'), value: 'coordinator' },
    { label: t('users.tabAdmins', 'Admins'), value: 'super_admin' },
    { label: t('users.tabCafetin', 'Cafetín'), value: 'cafetin' }
  ];

  useEffect(() => {
    setPage(1);
    fetchUsers(1, true);
  }, [roleFilter]);

  const fetchUsers = async (pageNum = page, reset = false) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await api.get('/admin/users', {
        params: { role: roleFilter || undefined, limit: 50, page: pageNum }
      });
      const userData = response.data?.data || [];
      
      if (reset) {
        setUsers(userData);
      } else {
        setUsers(prev => [...prev, ...userData]);
      }
      setTotalPages(response.data?.totalPages || 1);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: t('dashboard.couldNotSend', 'No se pudieron cargar los usuarios')
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchUsers(nextPage);
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
      level: user.level || '',
      materia_principal: user.materia_principal || ''
    });
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!formData.full_name || !formData.email) {
      showAlert({
        type: 'warning',
        title: t('dashboard.error', 'Campos Incompletos'),
        message: t('dashboard.pleaseCompleteFields', 'Por favor completa los campos requeridos.')
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Correo Inválido'),
        message: t('users.invalidEmail', 'Por favor ingresa un correo electrónico válido.')
      });
      return;
    }

    const computeStudentLevel = (role, grade, explicitLevel) => {
      if (role === 'student' && grade) {
        const g = parseInt(grade);
        if (g >= 2 && g <= 6) return 'Primaria';
        if (g >= 7 && g <= 11) return 'Tercer Ciclo';
      }
      return explicitLevel || '';
    };

    setSaving(true);
    try {
      const computedLevel = computeStudentLevel(formData.role, formData.grade, formData.level);

      if (editingUser) {
        // Edit Mode
        await api.put(`/admin/users/${editingUser.id}`, {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          grade: formData.role === 'student' ? formData.grade : '',
          section: formData.role === 'student' ? formData.section : '',
          level: (formData.role === 'coordinator' || formData.role === 'teacher' || formData.role === 'student') ? computedLevel : '',
          materia_principal: formData.role === 'teacher' ? formData.materia_principal : null
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('users.userUpdated', 'Usuario actualizado correctamente.')
        });
      } else {
        // Create Mode
        await api.post('/admin/users', {
          ...formData,
          level: computedLevel
        });
        showAlert({
          type: 'success',
          title: t('dashboard.success', '¡Éxito!'),
          message: t('users.userCreated', 'Usuario creado exitosamente.')
        });
      }
      setModalVisible(false);
      setPage(1);
      fetchUsers(1, true);
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || t('dashboard.error', 'Error al guardar usuario');
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: errorMsg
      });
    } finally {
      setSaving(false);
    }
  };

  const handleActivateUser = async (id) => {
    try {
      await api.put(`/admin/users/${id}`, { is_active: true });
      showAlert({
        type: 'success',
        title: t('dashboard.success', '¡Activado!'),
        message: 'Usuario reactivado correctamente.'
      });
      setPage(1);
      fetchUsers(1, true);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: error.response?.data?.error || 'No se pudo reactivar el usuario.'
      });
    }
  };

  const handleDeleteUser = (id) => {
    showConfirm({
      type: 'danger',
      title: t('users.confirmDeleteTitle', 'Desactivar usuario'),
      message: t('users.confirmDeleteBody', '¿Estás seguro de que deseas desactivar este usuario? Ya no aparecerá en las listas activas.'),
      confirmText: t('dashboard.delete', 'Desactivar'),
      cancelText: t('dashboard.cancel', 'Cancelar'),
      onConfirm: async () => {
        try {
          await api.delete(`/admin/users/${id}`);
          showAlert({
            type: 'success',
            title: t('dashboard.success', '¡Desactivado!'),
            message: t('users.userDeleted', 'Usuario desactivado correctamente.')
          });
          setPage(1);
          fetchUsers(1, true);
        } catch (error) {
          console.error(error);
          showAlert({
            type: 'error',
            title: t('dashboard.error', 'Error'),
            message: error.response?.data?.error || 'No se pudo desactivar el usuario.'
          });
        }
      }
    });
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
      case 'cafetin': return { bg: '#d1fae5', text: '#059669' };
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

  const getSubjectLabel = (subjectId) => {
    const found = subjects.find(s => s.value === subjectId);
    return found ? found.label : 'Seleccionar Materia';
  };

  const getSectionLabel = (section) => {
    const found = sections.find(s => s.value === section);
    return found ? found.label : (section || 'Seleccionar Sección');
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('menu.users', 'Gestión de Usuarios')} 
        subtitle={t('users.subtitle', 'Administración de roles y cuentas institucionales')} 
      >
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.muted} style={styles.searchIcon} />
          <TextInput
            placeholder={t('users.searchPlaceholder', 'Buscar por nombre o código...')}
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
      </PageHeader>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
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
                    {item.is_active === false && (
                      <View style={[styles.roleBadge, { backgroundColor: '#f3f4f6' }]}>
                        <Text style={[styles.roleBadgeText, { color: '#6b7280' }]}>INACTIVO</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.actionBtn}>
                    <Edit2 size={18} color={Colors.primary} />
                  </TouchableOpacity>

                  {item.is_active === false ? (
                    <TouchableOpacity 
                      onPress={() => handleActivateUser(item.id)} 
                      style={[styles.actionBtn, { backgroundColor: '#dcfce7', marginTop: 8 }]}
                    >
                      <CheckCircle2 size={18} color="#16a34a" />
                    </TouchableOpacity>
                  ) : (
                    (item.id !== currentProfile?.id && (!(item.role === 'super_admin' || item.role === 'admin') || currentProfile?.full_name === 'Administrador Principal')) && (
                      <TouchableOpacity onPress={() => handleDeleteUser(item.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                        <Trash2 size={18} color={Colors.status.rejected} />
                      </TouchableOpacity>
                    )
                  )}

                </View>
              </View>
            );
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={Colors.primary} style={{ margin: 20 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('users.notFound', 'No se encontraron usuarios.')}</Text>
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
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={Keyboard.dismiss} 
          />
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
                  style={[styles.dropdownTrigger, editingUser?.id === currentProfile?.id && { opacity: 0.6 }]} 
                  onPress={() => {
                    if (editingUser?.id === currentProfile?.id) {
                      showAlert({
                        type: 'info',
                        title: 'Rol Protegido',
                        message: 'No puedes modificar tu propio rol de administrador.'
                      });
                      return;
                    }
                    setRoleDropdownOpen(!roleDropdownOpen);
                  }}
                  disabled={editingUser?.id === currentProfile?.id}
                >
                  <Shield size={18} color={Colors.text.muted} style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText}>
                    {getRoleLabel(formData.role)}
                  </Text>
                  <ChevronDown size={18} color={Colors.text.muted} />
                </TouchableOpacity>

                {roleDropdownOpen && editingUser?.id !== currentProfile?.id && (
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

              {formData.role === 'teacher' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Materia Principal / Especialidad</Text>
                  <TouchableOpacity 
                    style={styles.dropdownTrigger} 
                    onPress={() => setSubjectDropdownOpen(!subjectDropdownOpen)}
                  >
                    <Book size={18} color={Colors.text.muted} style={styles.inputIcon} />
                    <Text style={styles.dropdownTriggerText}>
                      {getSubjectLabel(formData.materia_principal)}
                    </Text>
                    <ChevronDown size={18} color={Colors.text.muted} />
                  </TouchableOpacity>

                  {subjectDropdownOpen && (
                    <ScrollView style={[styles.dropdownList, { maxHeight: 150 }]} nestedScrollEnabled>
                      {subjects.map(s => (
                        <TouchableOpacity
                          key={s.value}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({ ...formData, materia_principal: s.value });
                            setSubjectDropdownOpen(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{s.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
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
    marginHorizontal: -16,
    marginTop: 4,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
  },
  tabBtnText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    fontSize: Typography.size.xs,
  },
  tabBtnTextActive: {
    color: '#0B1956',
    fontWeight: '800',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    padding: 0,
    margin: 0,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'] || 24,
    borderTopRightRadius: BorderRadius['2xl'] || 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '90%',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    ...Shadows.elevated,
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
