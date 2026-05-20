import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../src/utils/api';
import { Plus, Trash2, Edit2, X, ChevronDown, Award, FileText, CheckCircle, Search } from 'lucide-react-native';

export default function ConductScreen() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  
  // Dropdown states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Positivo',
    description: ''
  });

  const categories = [
    { label: 'Positivo', value: 'Positivo' },
    { label: 'Leve', value: 'Leve' },
    { label: 'Grave', value: 'Grave' },
    { label: 'Gravísimo', value: 'Gravísimo' }
  ];

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
      Alert.alert('Error', 'No se pudieron cargar los códigos de conducta');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCode(null);
    setFormData({
      code: '',
      name: '',
      category: 'Positivo',
      description: ''
    });
    setModalVisible(true);
  };

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
      return;
    }

    setSaving(true);
    try {
      if (editingCode) {
        // Edit Mode
        await api.put(`/admin/conduct-codes/${editingCode.id}`, formData);
        Alert.alert('Éxito', 'Código actualizado correctamente.');
      } else {
        // Create Mode
        await api.post('/admin/conduct-codes', formData);
        Alert.alert('Éxito', 'Código creado exitosamente.');
      }
      setModalVisible(false);
      fetchCodes();
    } catch (error) {
      console.error(error);
      const errorMsg = error.response?.data?.error || 'Error al guardar código';
      Alert.alert('Error', errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCode = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este código de conducta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/conduct-codes/${id}`);
              Alert.alert('Éxito', 'Código eliminado.');
              fetchCodes();
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'No se pudo eliminar el código.');
            }
          }
        }
      ]
    );
  };

  const filteredCodes = codes.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' };
      case 'Leve': return { bg: '#fef9c3', text: '#a16207', border: '#fef08a' };
      case 'Grave': return { bg: '#ffedd5', text: '#ea580c', border: '#fed7aa' };
      default: return { bg: '#fee2e2', text: '#ef4444', border: '#fecaca' };
    }
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
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0B1956" />
        </View>
      ) : (
        <FlatList
          data={filteredCodes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const colors = getCategoryColor(item.category);
            return (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeText}>{item.code}</Text>
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
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron códigos de conducta.</Text>
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
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción</Text>
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
  },
  searchIcon: { marginRight: 8 },
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
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
