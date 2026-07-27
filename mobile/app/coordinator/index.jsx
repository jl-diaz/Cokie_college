import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Users, ChevronRight, User } from 'lucide-react-native';
import api from '../../src/utils/api';
import { useAuth } from '../../src/context/AuthContext';
import { Typography, Spacing, BorderRadius, Shadows } from '../../src/constants/theme';
import { useTheme } from '../../src/context/ThemeContext';
import { useAlert } from '../../src/context/AlertContext';
import PageHeader from '../../src/components/PageHeader';

export default function CoordinatorTeachersScreen() {
  const { t } = useTranslation();
  const { colors: Colors } = useTheme();
  const { showAlert } = useAlert();
  const styles = React.useMemo(() => createStyles(Colors), [Colors]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/coordinator/teachers');
      setTeachers(response.data);
    } catch (error) {
      showAlert({
        type: 'error',
        title: t('dashboard.error', 'Error'),
        message: 'No se pudieron cargar los maestros.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherPress = (teacher) => {
    router.push({ pathname: '/schedule', params: { teacher_id: teacher.id, teacher_name: teacher.full_name } });
  };

  return (
    <View style={styles.container}>
      <PageHeader 
        title={t('menu.teachers', 'Maestros')} 
        subtitle={t('home.teachersDesc', 'Maestros de tu nivel')} 
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {teachers.length === 0 ? (
            <Text style={styles.emptyText}>{t('users.notFound', 'No hay maestros registrados en este nivel.')}</Text>
          ) : (
            teachers.map((t) => (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleTeacherPress(t)}
                style={styles.card}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.iconBox}>
                    <User color={Colors.text.inverse} size={24} />
                  </View>
                  <View>
                    <Text style={styles.teacherName}>{t.full_name}</Text>
                    <Text style={styles.teacherCode}>{t.institutional_code}</Text>
                  </View>
                </View>
                <ChevronRight color={Colors.gray[300]} size={24} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.xl,
    paddingTop: 20,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  headerTitle: { color: '#FFF', fontSize: Typography.size.xl, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.size.sm, marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.xl },
  emptyText: { textAlign: 'center', color: Colors.text.muted, marginTop: 40 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { 
    width: 48, 
    height: 48, 
    borderRadius: BorderRadius.md, 
    backgroundColor: Colors.primaryLight || '#3b82f6', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: Spacing.lg 
  },
  teacherName: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.primary },
  teacherCode: { fontSize: Typography.size.xs, color: Colors.text.muted, marginTop: 2 }
});

