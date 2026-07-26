import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function QRCodeDisplay({ value, size = 180, color = '#0B1956', backgroundColor = '#FFFFFF' }) {
  if (!value) return null;

  return (
    <View style={[styles.container, { width: size + 24, height: size + 24 + 28, backgroundColor }]}>
      <QRCode
        value={value}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        ecl="M"
      />
      <Text style={styles.codeText} numberOfLines={1}>ID: {value.length > 16 ? value.substring(0, 13) + '...' : value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  codeText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748b',
    letterSpacing: 0.8,
  }
});
