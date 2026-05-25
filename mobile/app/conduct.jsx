import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ActivityIndicator, Alert, ScrollView } from 'react-native';
import api from '../src/utils/api';
import { Search, Plus, Trash2, Edit2, X, AlertTriangle, CheckCircle, Info } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function ConductCatalogScreen() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCode, setEditingCode] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Leve'
  });

  const categories = ['Positivo', 'Leve', 'Grave', 'Muy Grave'];

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
      Alert.alert('Error', 'No se pudo cargar el catálogo de conducta.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCode(null);
    setFormData({ code: '', name: '', category: 'Leve' });
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingCode(item);
    setFormData({
      code: item.code,
      name: item.name,
      category: item.category
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      Alert.alert('Error', 'Código y Descripción son obligatorios.');
      return;
    }

    setSaving(true);
    try {
      if (editingCode) {
        await api.put(`/admin/conduct-codes/${editingCode.id}`, formData);
        Alert.alert('Éxito', 'Código actualizado.');
      } else {
        await api.post('/admin/conduct-codes', formData);
        Alert.alert('Éxito', 'Código creado.');
      }
      setModalVisible(false);
      fetchCodes();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el código.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Deseas eliminar este código del catálogo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/conduct-codes/${id}`);
              fetchCodes();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el código.');
            }
          }
        }
      ]
    );
  };

  const filteredCodes = codes.filter(c => 
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
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Catálogo de Conducta</Text>
        <Text style={styles.headerSubtitle}>Define los códigos disciplinarios</Text>
        
        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.text.muted} style={styles.searchIcon} />
          <TextInput
            placeholder="Buscar código o descripción..."
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
          data={filteredCodes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const style = getCategoryStyle(item.category);
            return (
              <View style={styles.card}>
                <View style={styles.cardInfo}>
                  <View style={styles.codeRow}>
                    <Text style={styles.codeText}>{item.code}</Text>
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
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay códigos registrados.</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleOpenCreateModal}>
        <Plus size={28} color="#FFF" />
      </TouchableOpacity>

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
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Descripción</Text>
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
    paddingTop: 10,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  headerTitle: { color: '#FFF', fontSize: Typography.size.xl, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.sm, marginTop: 4, marginBottom: 20 },
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
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnText: { color: '#FFF', fontSize: Typography.size.md, fontWeight: 'bold' }
});
