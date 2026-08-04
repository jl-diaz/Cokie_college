import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import api from '../src/utils/api';
import { Calendar, RefreshCw, Check, Clock, User, BookOpen } from 'lucide-react-native';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useAlert } from '../src/context/AlertContext';
import PageHeader from '../src/components/PageHeader';

export default function AssignScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const { showAlert } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors, theme), [Colors, theme]);

  const [proposal, setProposal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const deleteExistingSchedule = async () => {
    setDeleting(true);
    try {
      await api.delete('/coordinator/schedules');
      showAlert({
        type: 'success',
        title: 'Horario Eliminado',
        message: 'El horario anterior ha sido borrado. Ya puedes generar uno nuevo.'
      });
      setProposal([]);
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'No se pudo eliminar el horario.'
      });
    } finally {
      setDeleting(false);
    }
  };

  const generateProposal = async () => {
    setLoading(true);
    setProposal([]);
    try {
      const res = await api.get('/coordinator/schedules/generate');
      setProposal(res.data || []);
    } catch (error) {
      const errData = error.response?.data;
      
      if (errData?.code !== 'SCHEDULE_EXISTS') {
        console.error(error);
      }
      
      if (errData?.code === 'SCHEDULE_EXISTS') {
        Alert.alert(
          'Horario Ya Existente',
          errData.error,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Eliminar Horario Actual', 
              style: 'destructive',
              onPress: deleteExistingSchedule 
            }
          ]
        );
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: errData?.error || 'No se pudo generar la propuesta de horario.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const applySchedule = async () => {
    if (proposal.length === 0) return;
    setApplying(true);
    try {
      await api.post('/coordinator/schedules/apply', { proposal });
      showAlert({
        type: 'success',
        title: 'Horario Aplicado',
        message: 'El horario ha sido guardado y aplicado correctamente.'
      });
      setProposal([]); // Reset after applying
    } catch (error) {
      console.error(error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'No se pudo aplicar el horario.'
      });
    } finally {
      setApplying(false);
    }
  };

  const getDayName = (dayNum) => {
    const days = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes' };
    return days[dayNum] || 'Desconocido';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // 07:00:00 -> 07:00
  };

  const renderProposal = () => {
    if (proposal.length === 0) return null;

    // Agrupar por salón para mostrarlo más ordenado
    const groupedByClass = {};
    proposal.forEach(p => {
      const key = `${p.grade}º '${p.section}'`;
      if (!groupedByClass[key]) groupedByClass[key] = [];
      groupedByClass[key].push(p);
    });

    return (
      <View style={styles.proposalContainer}>
        {Object.keys(groupedByClass).sort().map(classKey => (
          <View key={classKey} style={styles.classGroup}>
            <Text style={styles.classTitle}>Salón: {classKey}</Text>
            {groupedByClass[classKey].sort((a, b) => {
              if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
              return a.start_time.localeCompare(b.start_time);
            }).map((item, idx) => (
              <View key={idx} style={styles.scheduleItem}>
                <View style={styles.scheduleTime}>
                  <Text style={styles.dayText}>{getDayName(item.day_of_week)}</Text>
                  <Text style={styles.timeText}>{formatTime(item.start_time)} - {formatTime(item.end_time)}</Text>
                </View>
                <View style={styles.scheduleDetails}>
                  <Text style={styles.subjectText}>{item.subject_name}</Text>
                  <View style={styles.teacherRow}>
                    <User size={12} color={Colors.text.muted} />
                    <Text style={styles.teacherText}>{item.teacher_name}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Generador de Horarios"
        subtitle="Genera y asigna automáticamente horarios de clases"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Generación Automática</Text>
          <Text style={styles.description}>
            El sistema creará una propuesta de horario distribuyendo las materias y profesores disponibles para tu nivel, respetando las horas semanales por materia y evitando choques de horario.
          </Text>
          
          <TouchableOpacity 
            style={styles.generateBtn} 
            onPress={generateProposal}
            disabled={loading || applying || deleting}
          >
            {loading || deleting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <RefreshCw size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.generateBtnText}>
                  {proposal.length > 0 ? 'Generar Nueva Propuesta' : 'Generar Propuesta'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {proposal.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Propuesta Generada</Text>
            <Text style={styles.description}>
              Revisa la propuesta de horario por salón. Si estás de acuerdo, guárdala para aplicarla.
            </Text>

            <TouchableOpacity 
              style={styles.applyBtn} 
              onPress={applySchedule}
              disabled={applying}
            >
              {applying ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Check size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.applyBtnText}>Aprobar y Aplicar Horario</Text>
                </>
              )}
            </TouchableOpacity>

            {renderProposal()}
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  scrollContent: { padding: Spacing.lg },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  cardTitle: { 
    fontSize: Typography.size.lg, 
    fontWeight: 'bold', 
    color: Colors.primary, 
    marginBottom: Spacing.sm 
  },
  description: {
    fontSize: Typography.size.sm,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  generateBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  generateBtnText: {
    color: '#FFF',
    fontSize: Typography.size.md,
    fontWeight: 'bold',
  },
  applyBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: Typography.size.md,
    fontWeight: 'bold',
  },
  proposalContainer: {
    marginTop: Spacing.sm,
  },
  classGroup: {
    marginBottom: Spacing.xl,
    backgroundColor: theme === 'dark' ? Colors.gray[900] : Colors.gray[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  classTitle: {
    fontSize: Typography.size.md,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
    paddingBottom: Spacing.xs,
  },
  scheduleItem: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    ...Shadows.sm,
  },
  scheduleTime: {
    width: 90,
    borderRightWidth: 1,
    borderRightColor: Colors.gray[200],
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  dayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  timeText: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  scheduleDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  subjectText: {
    fontSize: Typography.size.sm,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  teacherText: {
    fontSize: 11,
    color: Colors.text.muted,
    marginLeft: 4,
  }
});
