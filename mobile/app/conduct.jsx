import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../src/utils/api';
<<<<<<< HEAD
import { Search, Plus, Trash2, Edit2, X, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function ConductCatalogScreen() {
=======
import { Plus, Trash2, Edit2, X, ChevronDown, Award, FileText, CheckCircle, Search } from 'lucide-react-native';

export default function ConductScreen() {
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
<<<<<<< HEAD
=======
  
  // Dropdown states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
<<<<<<< HEAD
    category: 'Leve'
  });

  const categories = ['Positivo', 'Leve', 'Grave', 'Muy Grave'];
=======
    category: 'Positivo',
    description: ''
  });

  const categories = [
    { label: 'Positivo', value: 'Positivo' },
    { label: 'Leve', value: 'Leve' },
    { label: 'Grave', value: 'Grave' },
    { label: 'Gravísimo', value: 'Gravísimo' }
  ];
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/conduct-codes');
      setCodes(response.data);
    } catch (error) {
      console.error(error);
<<<<<<< HEAD
      Alert.alert('Error', 'No se pudo cargar el catálogo de conducta.');
=======
      Alert.alert('Error', 'No se pudieron cargar los códigos de conducta');
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCode(null);
<<<<<<< HEAD
    setFormData({ code: '', name: '', category: 'Leve' });
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingCode(item);
    setFormData({
      code: item.code,
      name: item.name,
      category: item.category
=======
    setFormData({
      code: '',
      name: '',
      category: 'Positivo',
      description: ''
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    });
    setModalVisible(true);
  };

<<<<<<< HEAD
  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      Alert.alert('Error', 'Código y Descripción son obligatorios.');
=======
  const handleOpenEditModal = (code) => {
    setEditingCode(code);
    setFormData({
      code: code.code || '',
      name: code.name || '',
      category: code.category || 'Positivo',
      description: code.description || ''
    });
    setModalVisible(true);
  };

  const handleSaveCode = async () => {
    if (!formData.code || !formData.name || !formData.description) {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      return;
    }

    setSaving(true);
    try {
      if (editingCode) {
<<<<<<< HEAD
        await api.put(`/admin/conduct-codes/${editingCode.id}`, formData);
        Alert.alert('Éxito', 'Código actualizado.');
      } else {
        await api.post('/admin/conduct-codes', formData);
        Alert.alert('Éxito', 'Código creado.');
=======
        // Edit Mode
        await api.put(`/admin/conduct-codes/${editingCode.id}`, formData);
        Alert.alert('Éxito', 'Código actualizado correctamente.');
      } else {
        // Create Mode
        await api.post('/admin/conduct-codes', formData);
        Alert.alert('Éxito', 'Código creado exitosamente.');
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      }
      setModalVisible(false);
      fetchCodes();
    } catch (error) {
      console.error(error);
<<<<<<< HEAD
      Alert.alert('Error', 'No se pudo guardar el código.');
=======
      const errorMsg = error.response?.data?.error || 'Error al guardar código';
      Alert.alert('Error', errorMsg);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    } finally {
      setSaving(false);
    }
  };

<<<<<<< HEAD
  const handleDelete = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Deseas eliminar este código del catálogo?',
=======
  const handleDeleteCode = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este código de conducta?',
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/conduct-codes/${id}`);
<<<<<<< HEAD
              fetchCodes();
            } catch (error) {
=======
              Alert.alert('Éxito', 'Código eliminado.');
              fetchCodes();
            } catch (error) {
              console.error(error);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              Alert.alert('Error', 'No se pudo eliminar el código.');
            }
          }
        }
      ]
    );
  };

  const filteredCodes = codes.filter(c => 
<<<<<<< HEAD
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryStyle = (cat) => {
    switch (cat) {
      case 'Positivo': return { color: Colors.status.approved, bg: '#f0fdf4' };
      case 'Leve': return { color: Colors.status.pending, bg: '#fffbeb' };
      case 'Grave': return { color: Colors.status.rejected, bg: '#fef2f2' };
      case 'Muy Grave': return { color: '#7f1d1d', bg: '#fee2e2' };
      default: return { color: Colors.text.muted, bg: Colors.gray[100] };
=======
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'Leve': return { bg: '#fef9c3', text: '#a16207', border: '#fef08a' };
      case 'Grave': return { bg: '#ffedd5', text: '#ea580c', border: '#fed7aa' };
      default: return { bg: '#fee2e2', text: '#ef4444', border: '#fecaca' };
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
<<<<<<< HEAD
        <Text style={styles.headerTitle}>Catálogo de Conducta</Text>
        <Text style={styles.headerSubtitle}>Define los códigos disciplinarios</Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.muted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar código o descripción..."
            placeholderTextColor={Colors.text.muted}
=======
        <View style={styles.searchContainer}>
          <Search size={20} color="#8a8da0" style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar por nombre o código..."
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
          data={filteredCodes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
<<<<<<< HEAD
            const style = getCategoryStyle(item.category);
=======
            const colors = getCategoryColor(item.category);
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            return (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeText}>{item.code}</Text>
<<<<<<< HEAD
                    <View style={[styles.categoryBadge, { backgroundColor: style.bg }]}>
                      <Text style={[styles.categoryText, { color: style.color }]}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={styles.nameText}>{item.name}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.actionBtn}>
                    <Edit2 size={18} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                    <Trash2 size={18} color={Colors.status.rejected} />
=======
                    <View style={[styles.categoryBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <Text style={[styles.categoryBadgeText, { color: colors.text }]}>
                        {item.category}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.nameText}>{item.name}</Text>
                  <Text style={styles.descText}>{item.description}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.actionBtn}>
                    <Edit2 size={18} color="#0B1956" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCode(item.id)} style={[styles.actionBtn, styles.deleteBtn]}>
                    <Trash2 size={18} color="#ef4444" />
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
<<<<<<< HEAD
              <Text style={styles.emptyText}>No hay códigos registrados.</Text>
=======
              <Text style={styles.emptyText}>No se encontraron códigos de conducta.</Text>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleOpenCreateModal}>
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

<<<<<<< HEAD
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCode ? 'Editar Código' : 'Nuevo Código'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Código</Text>
                <TextInput
                  placeholder="Ej. L-01"
                  placeholderTextColor={Colors.text.muted}
                  value={formData.code}
                  onChangeText={(v) => setFormData({ ...formData, code: v })}
                  style={styles.input}
                />
=======
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
                {editingCode ? 'Editar Código' : 'Nuevo Código'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#0B1956" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Código</Text>
                <View style={styles.inputWrapper}>
                  <FileText size={18} color="#8a8da0" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Ej. CN01"
                    autoCapitalize="characters"
                    value={formData.code}
                    onChangeText={(v) => setFormData({ ...formData, code: v })}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Nombre/Conducta</Text>
                <View style={styles.inputWrapper}>
                  <Award size={18} color="#8a8da0" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Ej. Llegada tarde recurrente"
                    value={formData.name}
                    onChangeText={(v) => setFormData({ ...formData, name: v })}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoría de Gravedad</Text>
                <TouchableOpacity 
                  style={styles.dropdownTrigger} 
                  onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                >
                  <CheckCircle size={18} color="#8a8da0" style={styles.inputIcon} />
                  <Text style={styles.dropdownTriggerText}>
                    {formData.category}
                  </Text>
                  <ChevronDown size={18} color="#8a8da0" />
                </TouchableOpacity>

                {categoryDropdownOpen && (
                  <View style={styles.dropdownList}>
                    {categories.map(c => (
                      <TouchableOpacity
                        key={c.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, category: c.value });
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción</Text>
<<<<<<< HEAD
                <TextInput
                  placeholder="Ej. Uso inadecuado del uniforme"
                  placeholderTextColor={Colors.text.muted}
                  value={formData.name}
                  onChangeText={(v) => setFormData({ ...formData, name: v })}
                  style={[styles.input, styles.textArea]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Categoría</Text>
                <View style={styles.categoryRow}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryBtn, formData.category === cat && styles.categoryBtnActive]}
                      onPress={() => setFormData({ ...formData, category: cat })}
                    >
                      <Text style={[styles.categoryBtnText, formData.category === cat && styles.categoryBtnTextActive]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Guardar Código</Text>}
              </TouchableOpacity>
            </ScrollView>
=======
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    placeholder="Describe brevemente la conducta y consecuencias..."
                    placeholderTextColor="#8a8da0"
                    multiline
                    numberOfLines={4}
                    value={formData.description}
                    onChangeText={(v) => setFormData({ ...formData, description: v })}
                    style={[styles.input, styles.textArea]}
                  />
                </View>
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleSaveCode}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingCode ? 'Guardar Cambios' : 'Crear Código'}
                </Text>
              )}
            </TouchableOpacity>
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
          </View>
        </View>
      </Modal>
    </View>
  );
}



const styles = StyleSheet.create({
<<<<<<< HEAD
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 10,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  headerTitle: { color: '#FFF', fontSize: Typography.size.xl, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.sm, marginTop: 4, marginBottom: 20 },
=======
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0B1956',
    padding: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
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
  codeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  codeText: { fontSize: Typography.size.md, fontWeight: 'bold', color: Colors.primary, marginRight: 10 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
  categoryText: { fontSize: Typography.size.xs - 2, fontWeight: 'bold', textTransform: 'uppercase' },
  nameText: { fontSize: Typography.size.sm, color: Colors.text.secondary, lineHeight: 20 },
  cardActions: { justifyContent: 'space-around', alignItems: 'center', paddingLeft: 12 },
  actionBtn: { padding: 8, borderRadius: BorderRadius.sm, backgroundColor: Colors.gray[100] },
  deleteBtn: { backgroundColor: '#fee2e2', marginTop: 8 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.text.muted, fontSize: Typography.size.sm },
=======
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
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
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  codeText: { fontSize: 14, fontWeight: '900', color: '#0B1956', letterSpacing: 0.5 },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '800' },
  nameText: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  descText: { fontSize: 13, color: '#666', lineHeight: 18 },
  cardActions: { justifyContent: 'space-around', alignItems: 'center', paddingLeft: 12 },
  actionBtn: { padding: 8, borderRadius: 8, backgroundColor: '#f1f5f9' },
  deleteBtn: { backgroundColor: '#fee2e2', marginTop: 8 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#8a8da0', fontSize: 14 },
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
<<<<<<< HEAD
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.elevated,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modalContent: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '90%',
    padding: 24,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: Typography.size.xl, fontWeight: 'bold', color: Colors.primary },
  formGroup: { marginBottom: 20 },
  label: { fontSize: Typography.size.xs, fontWeight: '700', color: Colors.text.muted, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: 16,
    fontSize: Typography.size.sm,
    color: Colors.text.primary,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  categoryBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryBtnText: { fontSize: Typography.size.xs, color: Colors.text.secondary, fontWeight: 'bold' },
  categoryBtnTextActive: { color: '#FFF' },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
=======
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
  textAreaWrapper: {
    height: 100,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 14, color: '#333' },
  textArea: {
    textAlignVertical: 'top',
    height: '100%',
  },
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
  submitBtn: {
    backgroundColor: '#0B1956',
    borderRadius: 16,
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
<<<<<<< HEAD
  submitBtnText: { color: '#FFF', fontSize: Typography.size.md, fontWeight: 'bold' }
=======
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
>>>>>>> 01a6ed2f4f9acfb37c5cbdb9795ce1b320264c34
});
