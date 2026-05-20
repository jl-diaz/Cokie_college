import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import api from '../src/utils/api';
import { useAuth } from '../src/context/AuthContext';
import { UploadCloud, FileText, Calendar, ChevronDown, CheckCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';

export default function JustificationsScreen() {
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');
  const [evidenceUri, setEvidenceUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  const categories = ['Cita Médica', 'Justificación Médica', 'Motivo Familiar', 'Otro'];

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formatted = selectedDate.toISOString().split('T')[0];
      setDate(formatted);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permiso requerido', 'Necesitas permitir el acceso a la galería para subir evidencias.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setEvidenceUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!date || !reason || !category) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/student/justifications', {
        absence_date: date,
        reason: `[${category}] ${reason}`,
        evidence_url: evidenceUri || '' 
      });

      Alert.alert('Éxito', 'Solicitud enviada a coordinación exitosamente.');
      setDate('');
      setReason('');
      setCategory('');
      setEvidenceUri(null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo enviar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitud de Permisos</Text>
        <Text style={styles.headerSubtitle}>Justifica tu ausencia</Text>
      </View>

      <View style={styles.content}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name}</Text>
            <Text style={styles.profileDetail}>Carnet: {profile?.institutional_code}</Text>
            <Text style={styles.profileDetail}>Rol: {profile?.role?.replace('_', ' ')}</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <View style={styles.iconBox}><Calendar size={14} color="#0B1956" /></View>
              <Text style={styles.label}>Fecha del permiso</Text>
            </View>
            <TouchableOpacity 
              style={styles.inputTouchable} 
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.inputText, !date && styles.placeholderText]}>
                {date ? date : "Seleccionar fecha"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date ? new Date(date) : new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.labelNoIcon}>Tipo de solicitud</Text>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {categories.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.labelNoIcon}>Detalles del motivo</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Escriba aquí los detalles detallados..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
              placeholderTextColor="#8a8da0"
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <View style={styles.iconBox}><UploadCloud size={14} color="#0B1956" /></View>
              <Text style={styles.label}>Comprobante / Evidencia</Text>
            </View>
            <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7} onPress={pickImage}>
              {evidenceUri ? (
                <>
                  <CheckCircle size={32} color="#10b981" />
                  <Text style={[styles.uploadText, { color: '#10b981' }]}>Imagen adjuntada</Text>
                  <Text style={styles.uploadSubtext}>Toca para cambiar imagen</Text>
                </>
              ) : (
                <>
                  <UploadCloud size={32} color="#8a8da0" />
                  <Text style={styles.uploadText}>Adjuntar justificante</Text>
                  <Text style={styles.uploadSubtext}>(Toca para abrir galería)</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.btn, loading && styles.btnDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar a Coordinación</Text>}
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0B1956',
    padding: 24,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  content: {
    padding: 20,
    marginTop: -30,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8D9ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#0B1956',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: 'bold', color: '#0B1956', marginBottom: 2 },
  profileDetail: { fontSize: 12, color: '#8a8da0', textTransform: 'capitalize' },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  field: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBox: {
    width: 24,
    height: 24,
    backgroundColor: '#F5F7FA',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  label: { fontSize: 11, fontWeight: 'bold', color: '#0B1956', textTransform: 'uppercase', letterSpacing: 0.5 },
  labelNoIcon: { fontSize: 11, fontWeight: 'bold', color: '#0B1956', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputTouchable: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
  },
  inputText: {
    fontSize: 15,
    color: '#0B1956',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#8a8da0',
  },
  input: {
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#0B1956',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    flexDirection: 'row',
  },
  chipScroll: {
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: '#0B1956',
  },
  chipText: {
    color: '#8a8da0',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#FFF',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E8D9ED',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  uploadText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0B1956',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#8a8da0',
    marginTop: 4,
  },
  btn: {
    backgroundColor: '#0B1956',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
