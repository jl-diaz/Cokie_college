import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  TextInput, 
  StyleSheet, 
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Calendar, ChevronRight, BookOpen, X, Search, Sparkles } from 'lucide-react-native';
import api from '../src/utils/api';
import { useAuth } from '../src/context/AuthContext';
import { useAlert } from '../src/context/AlertContext';
import { Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';
import { useTheme } from '../src/context/ThemeContext';
import { useTranslation } from 'react-i18next';
import PageHeader from '../src/components/PageHeader';
import { generateClassroomReportsZip } from '../src/utils/pdfGenerator';

export default function ClassroomsScreen() {
  const { t } = useTranslation();
  const { colors: Colors, theme } = useTheme();
  const styles = useMemo(() => createStyles(Colors, theme), [Colors, theme]);
  const { showAlert } = useAlert();
  const { profile } = useAuth();
  const router = useRouter();

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const endpoint = profile?.role === 'coordinator' ? '/coordinator/classrooms' : '/teacher/classrooms';
      const response = await api.get(endpoint);
      setClassrooms(response.data || []);
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los salones disponibles.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomPress = (classroom) => {
    setSelectedClassroom(classroom);
    setShowPeriodSelector(false);
    setActionSheetVisible(true);
  };

  const navigateToStudents = () => {
    setActionSheetVisible(false);
    if (!selectedClassroom) return;
    router.push({ 
      pathname: '/class', 
      params: { grade: selectedClassroom.grade, section: selectedClassroom.section } 
    });
  };

  const navigateToSchedule = () => {
    setActionSheetVisible(false);
    if (!selectedClassroom) return;
    router.push({ 
      pathname: '/schedule', 
      params: { grade: selectedClassroom.grade, section: selectedClassroom.section } 
    });
  };

  const handleDownloadZip = async (period) => {
    if (!selectedClassroom) return;
    try {
      setDownloadingZip(true);
      // fetch students for this classroom
      const res = await api.get('/coordinator/students', {
        params: { grade: selectedClassroom.grade, section: selectedClassroom.section }
      });
      // The backend /coordinator/students might return all if no params, we need to filter them if it doesn't handle params
      let studentsList = res.data || [];
      if (studentsList.length > 0 && !studentsList[0].grade) {
         // Fallback if backend didn't filter
         studentsList = studentsList.filter(s => s.grade === selectedClassroom.grade && s.section === selectedClassroom.section);
      } else if (studentsList.length > 0) {
         studentsList = studentsList.filter(s => s.grade === selectedClassroom.grade && s.section === selectedClassroom.section);
      }
      
      if (studentsList.length === 0) {
        showAlert({ type: 'warning', title: 'Atención', message: 'No hay estudiantes en este salón.' });
        setDownloadingZip(false);
        return;
      }
      
      await generateClassroomReportsZip(selectedClassroom.id, period, studentsList);
      setActionSheetVisible(false);
    } catch (error) {
      showAlert({ type: 'error', title: 'Error', message: error.message || 'No se pudo generar el ZIP.' });
    } finally {
      setDownloadingZip(false);
    }
  };

  const filteredClassrooms = useMemo(() => {
    if (!searchQuery.trim()) return classrooms;
    const q = searchQuery.toLowerCase();
    return classrooms.filter(c => 
      c.grade?.toString().includes(q) || 
      c.section?.toLowerCase().includes(q) ||
      `${c.grade}º ${c.section}`.toLowerCase().includes(q)
    );
  }, [classrooms, searchQuery]);

  const getClassLevel = (grade) => {
    const g = parseInt(grade, 10);
    if (g >= 1 && g <= 6) return 'Primaria';
    if (g >= 7 && g <= 11) return 'Tercer Ciclo';
    return 'Nivel General';
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title="Gestión de Salones" 
        subtitle={profile?.role === 'coordinator' ? 'Monitoreo de salones del nivel asignado' : 'Aulas y grupos académicos a cargo'} 
      />

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <Search size={18} color={Colors.text.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filtrar por grado o sección (ej. 9, A)..."
          placeholderTextColor={Colors.text.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={Colors.text.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredClassrooms.length === 0 ? (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={Colors.text.muted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No hay salones que coincidan con la búsqueda.' : 'No hay salones disponibles en este nivel.'}
              </Text>
            </View>
          ) : (
            filteredClassrooms.map((cls, idx) => {
              const level = getClassLevel(cls.grade);
              return (
                <TouchableOpacity
                  key={`${cls.grade}-${cls.section}-${idx}`}
                  onPress={() => handleClassroomPress(cls)}
                  style={styles.card}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconBox}>
                    <BookOpen color="#FFF" size={24} />
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.gradeHeaderRow}>
                      <Text style={styles.gradeText}>{cls.grade}º Grado '{cls.section}'</Text>
                      <View style={[
                        styles.levelChip, 
                        level === 'Primaria' ? styles.levelChipPrimaria : styles.levelChipSecundaria
                      ]}>
                        <Text style={[
                          styles.levelChipText,
                          level === 'Primaria' ? styles.levelChipTextPrimaria : styles.levelChipTextSecundaria
                        ]}>
                          {level}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.sectionText}>Toca para gestionar asistencia o consultar horario</Text>
                  </View>

                  <ChevronRight color={Colors.text.muted} size={20} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Bottom Action Sheet Modal */}
      <Modal
        visible={isActionSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setActionSheetVisible(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {selectedClassroom?.grade}º Grado — Sección '{selectedClassroom?.section}'
                </Text>
                <Text style={styles.modalSubtitle}>Opciones y acciones disponibles</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeBtn} 
                onPress={() => setActionSheetVisible(false)}
              >
                <X size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={navigateToStudents} style={styles.actionItem} activeOpacity={0.8}>
              <View style={[styles.actionIconBox, { backgroundColor: Colors.primary }]}>
                <Users color="#FFF" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionText}>Lista de Estudiantes y Asistencia</Text>
                <Text style={styles.actionSubtext}>Toma de asistencia en vivo y reportes conductuales</Text>
              </View>
              <ChevronRight color={Colors.text.muted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity onPress={navigateToSchedule} style={styles.actionItem} activeOpacity={0.8}>
              <View style={[styles.actionIconBox, { backgroundColor: '#0284c7' }]}>
                <Calendar color="#FFF" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionText}>Ver Horario de Clases</Text>
                <Text style={styles.actionSubtext}>Materias, asignaciones y horas lectivas del grupo</Text>
              </View>
              <ChevronRight color={Colors.text.muted} size={18} />
            </TouchableOpacity>

            {profile?.role === 'coordinator' && (
              <>
                {!showPeriodSelector ? (
                  <TouchableOpacity onPress={() => setShowPeriodSelector(true)} style={styles.actionItem} activeOpacity={0.8}>
                    <View style={[styles.actionIconBox, { backgroundColor: '#10b981' }]}>
                      <BookOpen color="#FFF" size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionText}>Descargar Boletines (ZIP)</Text>
                      <Text style={styles.actionSubtext}>Genera un archivo ZIP con todos los PDFs del salón</Text>
                    </View>
                    <ChevronRight color={Colors.text.muted} size={18} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.actionItem, { flexDirection: 'column', alignItems: 'stretch' }]}>
                    <Text style={[styles.actionText, { marginBottom: 10, textAlign: 'center' }]}>Selecciona el Periodo a Descargar</Text>
                    {downloadingZip ? (
                      <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 10 }} />
                    ) : (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        {[1, 2, 3, 4].map(p => (
                          <TouchableOpacity 
                            key={p} 
                            style={{ padding: 10, backgroundColor: Colors.primaryLight, borderRadius: 8, minWidth: 40, alignItems: 'center', opacity: p > 2 ? 0.6 : 1 }}
                            onPress={() => {
                              if (p > 2) {
                                showAlert({
                                  type: 'warning',
                                  title: 'Periodo Incompleto',
                                  message: 'El boletín de este periodo aún no está disponible para descargar.'
                                });
                                return;
                              }
                              handleDownloadZip(p);
                            }}
                          >
                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>P{p}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (Colors, theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },

  // Search Bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
    ...Shadows.card,
  },
  searchInput: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.primary },

  scrollContent: { padding: Spacing.lg, paddingBottom: 40 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.text.muted, textAlign: 'center', fontSize: Typography.size.sm },

  // Classroom List Item Cards
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
    borderWidth: theme === 'dark' ? 1 : 0,
    borderColor: Colors.gray[200],
  },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: BorderRadius.lg, 
    backgroundColor: Colors.primary, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Spacing.md 
  },
  cardInfo: { flex: 1, marginRight: Spacing.xs },
  gradeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  gradeText: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.primary },
  sectionText: { fontSize: Typography.size.xs, color: Colors.text.muted },

  levelChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  levelChipPrimaria: { backgroundColor: '#e0f2fe' },
  levelChipSecundaria: { backgroundColor: '#f3e8ff' },
  levelChipText: { fontSize: 10, fontWeight: Typography.weight.bold },
  levelChipTextPrimaria: { color: '#0369a1' },
  levelChipTextSecundaria: { color: '#6b21a8' },

  // Bottom Action Sheet Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end', 
  },
  modalBackdrop: { flex: 1 },
  modalContent: { 
    backgroundColor: Colors.card, 
    borderTopLeftRadius: BorderRadius['2xl'], 
    borderTopRightRadius: BorderRadius['2xl'], 
    padding: Spacing.xl, 
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    ...Shadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200] || '#f1f5f9',
    paddingBottom: Spacing.md,
  },
  modalTitle: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.primary },
  modalSubtitle: { fontSize: Typography.size.xs, color: Colors.text.muted, marginTop: 2 },
  closeBtn: { padding: 4 },

  actionItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: Colors.background, 
    padding: Spacing.md, 
    borderRadius: BorderRadius.xl, 
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gray[200] || '#e2e8f0',
  },
  actionIconBox: { 
    padding: 10, 
    borderRadius: BorderRadius.lg, 
    marginRight: Spacing.md 
  },
  actionText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.primary },
  actionSubtext: { fontSize: 11, color: Colors.text.muted, marginTop: 2 }
});
