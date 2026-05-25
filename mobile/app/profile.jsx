import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { LogOut, User, Mail, Shield, Book, MapPin, Phone, Calendar } from 'lucide-react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../src/constants/theme';

export default function ProfileScreen() {
  const { profile, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que deseas salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Salir", style: "destructive", onPress: logout }
      ]
    );
  };

  const InfoItem = ({ icon: Icon, label, value }) => (
    <View style={styles.infoItem}>
      <View style={styles.iconBox}>
        <Icon size={20} color={Colors.primary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'No asignado'}</Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'U'}</Text>
          </View>
        </View>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{profile?.role?.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Información Personal</Text>
          <InfoItem icon={User} label="Código Institucional" value={profile?.institutional_code} />
          <InfoItem icon={Mail} label="Correo Electrónico" value={profile?.email} />
          <InfoItem icon={Phone} label="Teléfono" value={profile?.phone} />
        </View>

        {profile?.role === 'student' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Académica</Text>
            <InfoItem icon={Book} label="Grado" value={`${profile?.grade}º`} />
            <InfoItem icon={Shield} label="Sección" value={profile?.section} />
            <InfoItem icon={MapPin} label="Nivel" value={profile?.level} />
          </View>
        )}

        {profile?.role === 'teacher' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Información Laboral</Text>
            <InfoItem icon={Shield} label="Nivel Asignado" value={profile?.level} />
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color={Colors.status.rejected} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
        
        <Text style={styles.version}>Versión 1.0.0</Text>
        <View style={{height: 40}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing['3xl'],
    paddingTop: 60,
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius['3xl'],
    borderBottomRightRadius: BorderRadius['3xl'],
  },
  avatarContainer: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.elevated,
  },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: Colors.primary },
  name: { fontSize: Typography.size.xl, fontWeight: 'bold', color: '#FFF', marginBottom: 8 },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  roleText: { color: '#FFF', fontSize: Typography.size.xs, fontWeight: 'bold', letterSpacing: 1 },
  content: { padding: Spacing.xl, marginTop: -20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  cardTitle: { 
    fontSize: Typography.size.md, 
    fontWeight: 'bold', 
    color: Colors.primary, 
    marginBottom: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
    paddingBottom: 8,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: Typography.size.xs, color: Colors.text.muted, marginBottom: 2 },
  infoValue: { fontSize: Typography.size.md, fontWeight: 'bold', color: Colors.text.primary },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    padding: 16,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  logoutText: { color: Colors.status.rejected, fontWeight: 'bold', marginLeft: 10, fontSize: Typography.size.md },
  version: { textAlign: 'center', color: Colors.text.muted, fontSize: Typography.size.xs, marginTop: 24 }
});
