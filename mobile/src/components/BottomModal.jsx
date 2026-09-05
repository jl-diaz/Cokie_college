import React, { useState, useEffect, useRef } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BottomModal({ visible, onClose, children }) {
  const [showModal, setShowModal] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Use a ref to get the height, but don't hardcode it outside the component
  const screenHeight = Dimensions.get('window').height;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  if (!showModal) return null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={showModal}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlayContainer}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'padding' : undefined}
          style={styles.keyboardAvoiding}
          pointerEvents="box-none"
        >
          <Animated.View 
            style={[
              styles.panelWrapper, 
              { 
                transform: [{ translateY: slideAnim }],
                paddingBottom: Platform.OS === 'web' ? `env(safe-area-inset-bottom, ${insets.bottom}px)` : insets.bottom,
              }
            ]} 
            pointerEvents="box-none"
          >
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panelWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
  }
});
