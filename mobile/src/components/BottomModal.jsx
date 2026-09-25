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

export default function BottomModal({ visible, onClose, children }) {
  const [showModal, setShowModal] = useState(visible);
  const insets = useSafeAreaInsets();
  const { colors, theme } = useTheme();

  const [windowDimensions, setWindowDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });
    return () => sub?.remove?.();
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
  const bottomInset = isWeb ? 0 : Math.max(insets.bottom, 0);
  const topSafe = insets.top > 0 ? insets.top + 20 : 50;
  
  // Margen inferior seguro para asegurar que botones y contenido queden siempre accesibles sobre el Home Indicator
  const bottomClearance = Platform.OS === 'ios'
    ? Math.max(bottomInset, 20) + 8
    : (bottomInset > 0 ? bottomInset + 8 : 16);

  // Limitar altura máxima para que nunca se desborde fuera de la pantalla
  const maxSheetHeight = isWeb 
    ? Math.min(screenHeight * 0.9, 850) 
    : Platform.OS === 'ios'
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
          }
        ]} 
        onStartShouldSetResponder={() => Platform.OS !== 'web'}
        onResponderTerminationRequest={() => true}
      >
        {children}
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
      width: '100vw',
      height: '100vh',
    }),
    zIndex: 9999,
    elevation: 9999,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 25,
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

