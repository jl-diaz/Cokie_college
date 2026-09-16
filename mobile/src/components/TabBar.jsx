import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Home, Camera, MessageCircle, Grid, User } from 'lucide-react-native';
import { useTabBar } from '../context/TabBarContext';

const TABS = [
  { name: 'Hogar', route: '/home', icon: Home },
  { name: 'Intérprete', route: '/interpreter', icon: Camera },
  { name: 'Chat', route: '/chat', icon: MessageCircle },
  { name: 'Módulos', route: '/modules', icon: Grid },
  { name: 'Perfil', route: '/profile', icon: User },
];

export default function TabBar({ currentRoute }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { isTabBarHidden } = useTabBar();

  const isDesktopOrTablet = width >= 768;

  if (isDesktopOrTablet || isTabBarHidden) {
    return null;
  }

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
                    <Icon size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.activeLabel}>{tab.name}</Text>
                </View>
              ) : (
                <View style={styles.inactiveContainer}>
                  <Icon size={18} color="#8E8E93" strokeWidth={2} />
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 16 : 6,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  activeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EC4899', // Rosa Cokie / App Palette
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#18181B',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  activeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EC4899',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  inactiveContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
  },
});


