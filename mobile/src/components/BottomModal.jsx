import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Modal, 
  StyleSheet, 
  Pressable, 
  Animated, 
  Dimensions, 
  Platform, 
  Keyboard 
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
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  // Escuchar eventos de teclado de forma nativa para elevar el modal exactamente sobre el teclado
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
      Animated.timing(keyboardAnim, {
        toValue: h,
        duration: Platform.OS === 'ios' ? (e?.duration || 250) : 160,
        useNativeDriver: true,
      }).start();
    };

    const onKeyboardHide = (e) => {
      setKeyboardHeight(0);
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 200) : 150,
        useNativeDriver: true,
      }).start();
    };

    const subShow = Keyboard.addListener(showEvt, onKeyboardShow);
    const subHide = Keyboard.addListener(hideEvt, onKeyboardHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      slideAnim.setValue(screenHeight);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }).start();
    } else {
      Keyboard.dismiss();
      let finishedCalled = false;
      const finish = () => {
        if (!finishedCalled) {
          finishedCalled = true;
          setShowModal(false);
          setKeyboardHeight(0);
          keyboardAnim.setValue(0);
        }
      };

      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 200,
        useNativeDriver: true,
      }).start(finish);

      // Fallback para garantizar que el modal siempre se desmonte aun si la animación nativa se interrumpe
      const timer = setTimeout(finish, 230);
      return () => clearTimeout(timer);
    }
  }, [visible, screenHeight]);

  if (!showModal) return null;

  const bottomInset = Platform.OS === 'web' ? 0 : Math.max(insets.bottom, 0);
  const topSafe = insets.top > 0 ? insets.top + 20 : 50;
  // Limitar altura máxima para que nunca se desborde fuera de la pantalla al subir el teclado
  const maxSheetHeight = screenHeight - keyboardHeight - topSafe;

  const handleClose = () => {
    Keyboard.dismiss();
    if (onClose) onClose();
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={showModal}
      onRequestClose={handleClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View 
        style={styles.overlayContainer}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        {/* Fondo gris oscuro con tap para cerrar fuera del modal */}
        <Pressable 
          style={StyleSheet.absoluteFillObject} 
          onPress={handleClose}
          disabled={!visible}
          accessibilityLabel="Cerrar modal"
        />

        {/* Hoja modal inferior animada que sube con el teclado */}
        <Animated.View 
          style={[
            styles.panelWrapper, 
            { 
              transform: [{ translateY: Animated.subtract(slideAnim, keyboardAnim) }],
              backgroundColor: colors.card,
              paddingBottom: keyboardHeight > 0 ? 10 : (Platform.OS === 'ios' ? Math.min(bottomInset, 16) : 0),
              maxHeight: maxSheetHeight,
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
            }
          ]} 
          onStartShouldSetResponder={() => true}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  panelWrapper: {
    width: '100%',
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

