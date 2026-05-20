import { Tabs } from 'expo-router';
import { Home, User, Settings } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0B1957',
        tabBarStyle: {
          backgroundColor: '#F7F4ED',
        },
        headerStyle: {
          backgroundColor: '#0B1957',
        },
        headerTintColor: '#E8D9ED',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
