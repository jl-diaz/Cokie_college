import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../src/utils/api';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function ApplyConductScreen() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCode, setSelectedCode] = useState(null);
  const [observation, setObservation] = useState('');
  const [currentPeriod, setCurrentPeriod] = useState(1);
  
  const { studentId } = useLocalSearchParams();
  const router = useRouter();
  const { profile } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [codesRes, periodRes] = await Promise.all([
        api.get(profile?.role === 'teacher' ? '/teacher/conduct-codes' : '/coordinator/conduct-codes'),
        api.get('/coordinator/academic-periods').catch(() => ({ data: [{ period_number: 1 }] }))
      ]);
      setCodes(codesRes.data);
      const periodData = periodRes.data;
      if (Array.isArray(periodData) && periodData.length > 0) {
        setCurrentPeriod(periodData[0].period_number);
      } else if (periodData?.period_number) {
        setCurrentPeriod(periodData.period_number);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Positivo': return Colors.status.approved;
      case 'Leve': return Colors.status.pending;
      case 'Grave': return Colors.status.rejected;
      case 'Muy Grave': return Colors.primary;
      default: return Colors.text.muted;
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
        period: currentPeriod
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
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={Colors.text.inverse} size={24} />
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
              {selectedCode?.id === code.id && <CheckCircle color={Colors.status.approved} size={20} />}
            </View>
            <Text style={styles.codeName}>{code.name}</Text>
            <Text style={styles.codeDesc}>{code.description}</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: Spacing.xl }]}>Observación (Opcional)</Text>
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
            <ActivityIndicator color={Colors.text.inverse} />
          ) : (
            <>
              <AlertCircle color={Colors.text.inverse} size={20} style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Aplicar Sanción / Reconocimiento</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 40,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    ...Shadows.elevated,
  },
  backBtn: { marginBottom: Spacing.md },
  headerTitle: { color: Colors.text.inverse, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.sm, marginTop: 4 },
  content: { padding: Spacing.xl },
  sectionTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary, marginBottom: Spacing.md },
  codeCard: {
    backgroundColor: Colors.card,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.card,
  },
  codeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.gray[50],
  },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  codeName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.primary, marginBottom: 4 },
  codeDesc: { fontSize: Typography.size.xs, color: Colors.text.muted },
  input: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    fontSize: Typography.size.md,
    color: Colors.primary,
    textAlignVertical: 'top',
    minHeight: 100,
    ...Shadows.card,
  },
  submitBtn: {
    backgroundColor: Colors.status.rejected,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing['2xl'],
    ...Shadows.elevated,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: Colors.text.inverse, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold }
});

