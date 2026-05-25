import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, View } from 'react-native';
import { Menu } from 'lucide-react-native';
import { AuthProvider } from '../src/context/AuthContext';
import CustomDrawer from '../src/components/CustomDrawer';

export default function Layout() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={({ route }) => ({
          headerStyle: {
            backgroundColor: '#0B1957',
          },
          headerTintColor: '#FFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => {
             if (route.name === 'index' || route.name === '(auth)/login') return null;
             return (
               <TouchableOpacity 
                 onPress={() => setDrawerVisible(true)} 
                 style={{ 
                   width: 40, 
                   height: 40, 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   marginRight: 0,
                 }}
                 activeOpacity={0.7}
               >
                 <Menu size={24} color="#FFF" />
               </TouchableOpacity>
             );
          }
        })}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: 'Inicio', headerLeft: () => null }} />
        <Stack.Screen name="diary" options={{ title: 'Diario Pedagógico' }} />
        <Stack.Screen name="justifications" options={{ title: 'Justificaciones' }} />
        <Stack.Screen name="schedule" options={{ title: 'Horario' }} />
        <Stack.Screen name="grades" options={{ title: 'Notas' }} />
        <Stack.Screen name="profile" options={{ title: 'Mi Perfil' }} />
        <Stack.Screen name="users" options={{ title: 'Control de Usuarios' }} />
        <Stack.Screen name="conduct" options={{ title: 'Catálogo de Conducta' }} />
        <Stack.Screen name="students" options={{ title: 'Listado de Estudiantes' }} />
        <Stack.Screen name="assign" options={{ title: 'Asignar Clases' }} />
        <Stack.Screen name="class" options={{ title: 'Clase Activa' }} />
        <Stack.Screen name="classrooms" options={{ title: 'Salones' }} />
        <Stack.Screen name="coordinator-justifications" options={{ title: 'Justificaciones' }} />
        <Stack.Screen name="coordinator" options={{ title: 'Profesores' }} />
        <Stack.Screen name="teacher-grades" options={{ title: 'Ingreso de Notas' }} />
      </Stack>
      <CustomDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </AuthProvider>
  );
}
