import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../src/utils/api';
import { AlertCircle, CheckCircle, ArrowLeft, ChevronDown } from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';

export default function ApplyConductScreen() {
  const { colors: Colors, theme } = useTheme();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [observation, setObservation] = useState('');
  
  const { studentId } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const endpoint = profile?.role === 'teacher' ? '/teacher/conduct-codes' : '/coordinator/conduct-codes';
      const response = await api.get(endpoint);
      setCodes(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los códigos de conducta');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedCode) {
      Alert.alert('Error', 'Debe seleccionar un código de conducta');
      return;
    }
    try {
      setSaving(true);
      const endpoint = profile?.role === 'teacher' ? '/teacher/conduct-records' : '/coordinator/conduct-records';
      await api.post(endpoint, {
        student_id: studentId,
        code_id: selectedCode.id,
        observation: observation,
        period: 1 // Default to 1 for now
      });
      Alert.alert('Éxito', 'Código de conducta aplicado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo aplicar el código');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0B1956" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aplicar Código</Text>
        <Text style={styles.headerSubtitle}>Registro de Conducta</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Seleccione un Código</Text>
        {codes.map(code => (
          <TouchableOpacity 
            key={code.id}
            style={[styles.codeCard, selectedCode?.id === code.id && styles.codeCardSelected]}
            onPress={() => setSelectedCode(code)}
          >
            <View style={styles.codeHeader}>
              <View style={[styles.badge, { backgroundColor: getCategoryColor(code.category) + '20' }]}>
                <Text style={[styles.badgeText, { color: getCategoryColor(code.category) }]}>{code.category}</Text>
              </View>
              {selectedCode?.id === code.id && <CheckCircle color="#10b981" size={20} />}
            </View>
            <Text style={styles.codeName}>{code.name}</Text>
            <Text style={styles.codeDesc}>{code.description}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Observación (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Añada detalles adicionales..."
          multiline
          numberOfLines={4}
          value={observation}
          onChangeText={setObservation}
        />

        <TouchableOpacity 
          style={[styles.submitBtn, (!selectedCode || saving) && styles.submitBtnDisabled]}
          onPress={handleApply}
          disabled={!selectedCode || saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <AlertCircle color="#FFF" size={20} style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Aplicar Sanción / Reconocimiento</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getCategoryColor = (category) => {
  switch (category) {
    case 'Positivo': return '#10b981';
    case 'Leve': return '#f59e0b';
    case 'Grave': return '#f97316';
    case 'Muy Grave': return '#ef4444';
    default: return '#0B1956';
  }
};

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    backgroundColor: theme === 'dark' ? Colors.card : '#0B1956',
    padding: 24,
    paddingTop: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: theme === 'dark' ? 1 : 0,
    borderBottomColor: Colors.gray[200],
  },
  backBtn: { marginBottom: 16 },
  headerTitle: { color: theme === 'dark' ? Colors.primary : '#FFF', fontSize: 24, fontWeight: 'bold' },
  headerSubtitle: { color: theme === 'dark' ? Colors.text.secondary : 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 12 },
  codeCard: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme === 'dark' ? Colors.gray[200] : 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  codeCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
  },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  codeName: { fontSize: 16, fontWeight: 'bold', color: Colors.text.primary, marginBottom: 4 },
  codeDesc: { fontSize: 13, color: Colors.text.muted },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.2 : 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
  },
  submitBtn: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
