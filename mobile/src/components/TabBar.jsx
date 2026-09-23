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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';

const TABS = [
  { key: 'home', name: 'Hogar', route: '/home', icon: Home },
  { key: 'interpreter', name: 'Intérprete', route: '/interpreter', icon: Camera },
  { key: 'chat', name: 'Chat', route: '/chat', icon: MessageCircle },
  { key: 'modules', name: 'Módulos', route: '/modules', icon: Grid },
  { key: 'profile', name: 'Perfil', route: '/profile', icon: User },
];

const HORIZONTAL_PADDING = 16;
const TAB_BAR_HEIGHT = 68;
const PILL_HEIGHT = 52;
const PILL_TOP = (TAB_BAR_HEIGHT - PILL_HEIGHT) / 2; // Centrado verticalmente dentro de la barra
const PILL_INSET = 8;

export default function TabBar({ currentRoute }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isTabBarHidden } = useTabBar();
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';

  const isDesktopOrTablet = width >= 768;

  let activeIndex = TABS.findIndex(t => currentRoute === t.route);
  if (activeIndex === -1) activeIndex = 0;

  // Ancho efectivo del floating pill bar
  const barWidth = width - (HORIZONTAL_PADDING * 2);
  const tabWidth = barWidth / TABS.length;
  // Ancho armónico y bien proporcionado de la esfera para evitar que se vea chata
  const pillWidth = Math.min(tabWidth - (PILL_INSET * 2), 54);

  // Animación del indicador líquido deslizante
  const translateX = useRef(new Animated.Value(activeIndex * tabWidth)).current;
  const liquidScaleX = useRef(new Animated.Value(1)).current;
  const liquidScaleY = useRef(new Animated.Value(1)).current;

  // Animaciones por pestaña
  const tabAnims = useRef(
    TABS.map((_, i) => ({
      translateY: new Animated.Value(0),
      labelOpacity: new Animated.Value(i === activeIndex ? 1 : 0),
      scale: new Animated.Value(i === activeIndex ? 1.05 : 0.95),
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
      // Deformación líquida orgánica sutil durante el viaje (sin aplanar la esfera)
      Animated.sequence([
        Animated.parallel([
          Animated.timing(liquidScaleX, {
            toValue: 1.12,
            duration: 110,
            useNativeDriver: true,
          }),
          Animated.timing(liquidScaleY, {
            toValue: 0.93,
            duration: 110,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(liquidScaleX, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
          Animated.spring(liquidScaleY, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Desplazamiento elástico fluido del pill activo
      Animated.spring(translateX, {
        toValue: targetX,
        friction: 6.5,
        tension: 65,
        velocity: 2,
        useNativeDriver: true,
      }).start();
    } else {
      translateX.setValue(targetX);
    }

    // Transición suave: solo la sección seleccionada muestra su etiqueta y resalta
    TABS.forEach((_, i) => {
      const isActive = i === toIndex;
      Animated.parallel([
        Animated.spring(tabAnims[i].translateY, {
          toValue: 0,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.spring(tabAnims[i].scale, {
          toValue: isActive ? 1.05 : 0.95,
          friction: 6,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(tabAnims[i].labelOpacity, {
          toValue: isActive ? 1 : 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [activeIndex, tabWidth]);

  if (isDesktopOrTablet || isTabBarHidden) {
    return null;
  }

  const getTabLabel = (tab) => {
    switch (tab.key) {
      case 'home':
        return t('nav.home', 'Hogar');
      case 'interpreter':
        return t('nav.interpreter', 'Intérprete');
      case 'chat':
        return t('nav.chat', 'Chat');
      case 'modules':
        return t('nav.modules', 'Módulos');
      case 'profile':
        return t('nav.profile', 'Perfil');
      default:
        return tab.name;
    }
  };

  // Elevado para evitar colisiones con la barra de acciones o botones del teléfono
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16) + 16;

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: bottomOffset }]}>
      <View style={styles.tabBar}>
        {/* Indicador Líquido / Esfera Activa Deslizante contenida en la barra */}
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
          <View style={[
            styles.activePill, 
            { 
              width: pillWidth,
              backgroundColor: isDark ? colors.primary : '#FFFFFF',
            }
          ]} />
        </Animated.View>

        {/* Pestañas del Menú */}
        {TABS.map((tab, index) => {
          const isActive = index === activeIndex;
          const Icon = tab.icon;
          const anim = tabAnims[index];

          return (
            <TouchableOpacity
              key={tab.route}
              activeOpacity={0.8}
              onPress={() => {
                if (currentRoute !== tab.route) {
                  router.push(tab.route);
                }
              }}
              style={styles.tabItem}
            >
              {/* Contenedor del contenido del tab centrado con la esfera */}
              <Animated.View
                style={[
                  styles.tabInnerContent,
                  {
                    transform: [
                      { translateY: anim.translateY },
                      { scale: anim.scale },
                    ],
                  },
                ]}
              >
                <Icon
                  size={isActive ? 18 : 20}
                  color={
                    isActive 
                      ? (isDark ? '#FFFFFF' : '#18181B') 
                      : 'rgba(255, 255, 255, 0.5)'
                  }
                  strokeWidth={isActive ? 2.5 : 2}
                />

                {/* Solo la sección seleccionada muestra su texto */}
                {isActive && (
                  <Animated.View
                    style={[
                      styles.labelSlot,
                      {
                        opacity: anim.labelOpacity,
                      },
                    ]}
                  >
                    <Text 
                      style={[
                        styles.activeLabel,
                        { color: isDark ? '#FFFFFF' : '#18181B' }
                      ]} 
                      numberOfLines={1}
                    >
                      {getTabLabel(tab)}
                    </Text>
                  </Animated.View>
                )}
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
    left: HORIZONTAL_PADDING,
    right: HORIZONTAL_PADDING,
    backgroundColor: 'transparent',
    zIndex: 999,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    height: TAB_BAR_HEIGHT,
    backgroundColor: '#18181B', // Negro mate en ambos modos (claro y oscuro)
    borderRadius: TAB_BAR_HEIGHT / 2, // Cápsula flotante redondeada
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
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
    borderRadius: PILL_HEIGHT / 2,
    shadowOpacity: 0,
    elevation: 0,
  },
  tabItem: {
    flex: 1,
    height: TAB_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  tabInnerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: PILL_HEIGHT,
  },
  labelSlot: {
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
