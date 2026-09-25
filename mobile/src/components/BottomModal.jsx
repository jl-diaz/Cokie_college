import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Animated, 
  Dimensions, 
  Platform, 
  Keyboard,
  BackHandler
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useTabBar } from '../context/TabBarContext';

export default function BottomModal({ visible, onClose, children }) {
  const [showModal, setShowModal] = useState(visible);
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();
  const { registerModal, unregisterModal } = useTabBar?.() || {};

  // Ocultar TabBar mientras el modal esté visible
  useEffect(() => {
    if (visible && registerModal) {
      registerModal();
      return () => {
        unregisterModal?.();
      };
    }
  }, [visible, registerModal, unregisterModal]);

  // Medir viewport dinámico en web (Safari/Chrome toolbar) y dimensiones de pantalla en nativo
  const getViewportDimensions = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.visualViewport?.height || window.innerHeight || Dimensions.get('window').height,
      };
    }
    return Dimensions.get('window');
  };

  const [windowDimensions, setWindowDimensions] = useState(getViewportDimensions);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const updateDim = () => {
        setWindowDimensions(getViewportDimensions());
      };
      window.addEventListener('resize', updateDim);
      window.visualViewport?.addEventListener('resize', updateDim);
      return () => {
        window.removeEventListener('resize', updateDim);
        window.visualViewport?.removeEventListener('resize', updateDim);
      };
    } else {
      const sub = Dimensions.addEventListener('change', ({ window }) => {
        setWindowDimensions(window);
      });
      return () => sub?.remove?.();
    }
  }, []);

  const screenHeight = windowDimensions.height;
  const screenHeightRef = useRef(screenHeight);
  useEffect(() => {
    screenHeightRef.current = screenHeight;
  }, [screenHeight]);

  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  // Escuchar eventos de teclado: en iOS eleva el modal sobre el teclado; en Android 'pan' mode lo maneja el OS nativo
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
      if (Platform.OS === 'ios') {
        Animated.timing(keyboardAnim, {
          toValue: h,
          duration: e?.duration || 250,
          useNativeDriver: true,
        }).start();
      }
    };

    const onKeyboardHide = (e) => {
      setKeyboardHeight(0);
      if (Platform.OS === 'ios') {
        Animated.timing(keyboardAnim, {
          toValue: 0,
          duration: e?.duration || 200,
          useNativeDriver: true,
        }).start();
      }
    };

    const subShow = Keyboard.addListener(showEvt, onKeyboardShow);
    const subHide = Keyboard.addListener(hideEvt, onKeyboardHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  // Manejar el botón 'Atrás' nativo de Android
  useEffect(() => {
    if (!visible) return;
    const onBackPress = () => {
      handleClose();
      return true;
    };
    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [visible]);

  useEffect(() => {
    const currentHeight = screenHeightRef.current || screenHeight;
    if (visible) {
      if (Platform.OS !== 'web') {
        Keyboard.dismiss();
      }
      setShowModal(true);
      slideAnim.setValue(currentHeight);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      if (Platform.OS !== 'web') {
        Keyboard.dismiss();
      }
      let finishedCalled = false;
      const finish = () => {
        if (!finishedCalled) {
          finishedCalled = true;
          setShowModal(false);
          setKeyboardHeight(0);
          keyboardAnim.setValue(0);
        }
      };

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: currentHeight,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start(finish);

      // Fallback para garantizar que el modal siempre se desmonte aun si la animación nativa se interrumpe
      const timer = setTimeout(finish, 230);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!showModal) return null;

  const isWeb = Platform.OS === 'web';
  const isIOS = Platform.OS === 'ios';
  const isMobileWeb = isWeb && (
    typeof navigator !== 'undefined' && 
    /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '')
  );

  const bottomInset = Math.max(insets?.bottom || 0, 0);

  // Margen inferior holgado y seguro para evitar colisiones con el Home Indicator o la barra de pestañas del navegador web (Safari/Chrome)
  const bottomClearance = isIOS
    ? Math.max(bottomInset, 24) + 16
    : isMobileWeb
      ? Math.max(bottomInset, 36) + 20
      : isWeb
        ? 28
        : (bottomInset > 0 ? bottomInset + 16 : 24);

  const topSafe = (insets?.top || 0) > 0 ? insets.top + 20 : (isWeb ? 36 : 50);

  // Limitar altura máxima para que nunca se desborde fuera de la pantalla visible
  const maxSheetHeight = isWeb 
    ? Math.min(screenHeight - topSafe - (keyboardHeight > 0 ? keyboardHeight : 0), 850)
    : isIOS
      ? (screenHeight - keyboardHeight - topSafe)
      : (screenHeight - topSafe);

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
    if (onClose) onClose();
  };

  return (
    <View 
      style={styles.overlayContainer}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Fondo gris oscuro con tap para cerrar fuera del modal */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFillObject, 
          { 
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            opacity: fadeAnim 
          }
        ]} 
      >
        <Pressable 
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
          disabled={!visible}
          accessibilityLabel="Cerrar modal"
        />
      </Animated.View>

      {/* Hoja modal inferior animada que sube con el teclado */}
      <Animated.View 
        style={[
          styles.panelWrapper, 
          { 
            transform: [{ translateY: Animated.subtract(slideAnim, keyboardAnim) }],
            backgroundColor: colors.card,
            paddingBottom: keyboardHeight > 0 ? 12 : bottomClearance,
            maxHeight: maxSheetHeight,
            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
          },
          isWeb && {
            paddingBottom: keyboardHeight > 0 ? 12 : `max(${bottomClearance}px, calc(env(safe-area-inset-bottom, 20px) + 20px))`,
          }
        ]} 
        onStartShouldSetResponder={() => Platform.OS !== 'web'}
        onResponderTerminationRequest={() => true}
      >
        <View style={styles.contentWrapper}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === 'web' && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      maxHeight: '100dvh',
    }),
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  panelWrapper: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 640 : '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 25,
  },
  contentWrapper: {
    width: '100%',
    maxHeight: '100%',
    flexShrink: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});

