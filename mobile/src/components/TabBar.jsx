import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  useWindowDimensions, 
  Animated 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Camera, MessageCircle, Grid, User } from 'lucide-react-native';
import { useTabBar } from '../context/TabBarContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';

const TABS = [
  { key: 'home', name: 'Hogar', route: '/home', icon: Home },
  { key: 'interpreter', name: 'Intérprete', route: '/interpreter', icon: Camera },
  { key: 'chat', name: 'Chat', route: '/chat', icon: MessageCircle },
  { key: 'modules', name: 'Módulos', route: '/modules', icon: Grid },
  { key: 'profile', name: 'Perfil', route: '/profile', icon: User },
];

const HORIZONTAL_PADDING = 18;
const TAB_BAR_HEIGHT = 56;
const PILL_HEIGHT = 38;
const PILL_TOP = (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2; // Exactamente 9px centrado verticalmente

export default function TabBar({ currentRoute }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTabBarHidden, unreadChatCount = 0, setUnreadChatCount, navigateTab } = useTabBar();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isDesktopOrTablet = width >= 768;

  let activeIndex = TABS.findIndex(t => currentRoute === t.route);
  if (activeIndex === -1) activeIndex = 0;

  // Ancho efectivo del floating pill bar
  const barWidth = Math.min(width - (HORIZONTAL_PADDING * 2), 400);
  const tabWidth = barWidth / TABS.length;
  // Forma ovalada tipo Instagram: horizontalmente extendida (ancho > alto)
  const pillWidth = Math.min(tabWidth - 10, 56);

  // Animación del indicador líquido deslizante
  const translateX = useRef(new Animated.Value(activeIndex * tabWidth)).current;
  const liquidScaleX = useRef(new Animated.Value(1)).current;
  const liquidScaleY = useRef(new Animated.Value(1)).current;

  // Animaciones por pestaña
  const tabAnims = useRef(
    TABS.map((_, i) => ({
      scale: new Animated.Value(i === activeIndex ? 1.08 : 0.96),
    }))
  ).current;

  const prevIndexRef = useRef(activeIndex);

  useEffect(() => {
    const fromIndex = prevIndexRef.current;
    const toIndex = activeIndex;
    prevIndexRef.current = toIndex;

    const targetX = toIndex * tabWidth;
    const isMoving = fromIndex !== toIndex;

    if (isMoving) {
      // Deformación líquida orgánica sutil durante el viaje
      Animated.sequence([
        Animated.parallel([
          Animated.timing(liquidScaleX, {
            toValue: 1.10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(liquidScaleY, {
            toValue: 0.94,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(liquidScaleX, {
            toValue: 1,
            friction: 6,
            tension: 85,
            useNativeDriver: true,
          }),
          Animated.spring(liquidScaleY, {
            toValue: 1,
            friction: 6,
            tension: 85,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Desplazamiento elástico fluido del pill activo
      Animated.spring(translateX, {
        toValue: targetX,
        friction: 7,
        tension: 70,
        velocity: 1.8,
        useNativeDriver: true,
      }).start();
    } else {
      translateX.setValue(targetX);
    }

    // Resaltar icono activo
    TABS.forEach((_, i) => {
      const isActive = i === toIndex;
      Animated.spring(tabAnims[i].scale, {
        toValue: isActive ? 1.08 : 0.96,
        friction: 6,
        tension: 75,
        useNativeDriver: true,
      }).start();
    });
  }, [activeIndex, tabWidth]);

  // Monitorear mensajes no leídos de CokieChat
  useEffect(() => {
    let isMounted = true;
    const fetchChatUnread = async () => {
      try {
        const res = await api.get('/chat/conversations');
        if (res.data && Array.isArray(res.data) && isMounted) {
          const totalUnread = res.data.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
          if (setUnreadChatCount) {
            setUnreadChatCount(totalUnread);
          }
        }
      } catch (e) {
        // Silencioso si no está autenticado o sin red
      }
    };

    fetchChatUnread();
    const interval = setInterval(fetchChatUnread, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentRoute]);

  if (isDesktopOrTablet || isTabBarHidden) {
    return null;
  }

  // Elevado para evitar colisiones con la barra de navegación del teléfono
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16) + 12;

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: bottomOffset }]}>
      <View style={[styles.tabBar, { width: barWidth }]}>
        {/* Indicador Ovalado / Cápsula Activa Deslizante contenida en la barra */}
        <Animated.View
          style={[
            styles.liquidBubbleContainer,
            {
              width: tabWidth,
              transform: [
                { translateX },
                { scaleX: liquidScaleX },
                { scaleY: liquidScaleY },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View 
            style={[
              styles.activePill, 
              { 
                width: pillWidth,
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.20)',
              }
            ]} 
          />
        </Animated.View>

        {/* Pestañas del Menú: Iconos centrados al píxel estilo Instagram */}
        {TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          const Icon = tab.icon;
          const anim = tabAnims[index];

          return (
            <TouchableOpacity
              key={tab.route}
              activeOpacity={0.7}
              onPress={() => {
                if (currentRoute !== tab.route) {
                  if (navigateTab) {
                    navigateTab(tab.route, router, currentRoute);
                  } else {
                    router.push(tab.route);
                  }
                }
              }}
              style={styles.tabItem}
            >
              <Animated.View
                style={[
                  styles.tabInnerContent,
                  {
                    transform: [
                      { scale: anim.scale },
                    ],
                  },
                ]}
              >
                <View style={styles.iconBox}>
                  <Icon
                    size={23}
                    color={
                      isActive 
                        ? '#FFFFFF' 
                        : 'rgba(255, 255, 255, 0.65)'
                    }
                    strokeWidth={isActive ? 2.4 : 1.9}
                  />
                  {/* Punto rojo de notificación para Chat si y solo si hay mensajes no leídos */}
                  {tab.key === 'chat' && (unreadChatCount || 0) > 0 && (
                    <View style={styles.redDot} />
                  )}
                </View>
              </Animated.View>
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
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    backgroundColor: 'rgba(18, 18, 22, 0.92)', // Fondo translúcido profundo estilo Instagram
    borderRadius: TAB_BAR_HEIGHT / 2, // Cápsula flotante redondeada
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }),
  },
  liquidBubbleContainer: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    height: PILL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  activePill: {
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2, // Forma perfectamente ovalada / cápsula horizontal
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabInnerContent: {
    width: '100%',
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  redDot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: '#121216',
  },
});
