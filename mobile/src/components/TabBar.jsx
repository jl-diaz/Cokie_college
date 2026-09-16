import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, Camera, MessageCircle, Grid, User } from 'lucide-react-native';

const TABS = [
  { name: 'Hogar', route: '/home', icon: Home },
  { name: 'Intérprete', route: '/interpreter', icon: Camera },
  { name: 'Chat', route: '/chat', icon: MessageCircle },
  { name: 'Módulos', route: '/modules', icon: Grid },
  { name: 'Perfil', route: '/profile', icon: User },
];

export default function TabBar({ currentRoute }) {
  const router = useRouter();

  let activeIndex = TABS.findIndex(t => currentRoute === t.route);
  if (activeIndex === -1) activeIndex = 0;

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          const Icon = tab.icon;

          return (
            <TouchableOpacity 
              key={tab.route}
              activeOpacity={0.8}
              onPress={() => router.push(tab.route)}
              style={styles.tabItem}
            >
              {isActive ? (
                <View style={styles.activeContainer}>
                  <View style={styles.activeCircle}>
                    <Icon size={22} color="#000000" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.activeLabel}>{tab.name}</Text>
                </View>
              ) : (
                <View style={styles.inactiveContainer}>
                  <Icon size={22} color="#8E8E93" strokeWidth={2} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#18181B',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  activeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#39FF14', // Vibrant neon green
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#18181B',
    shadowColor: '#39FF14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#39FF14',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  inactiveContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
  },
});

