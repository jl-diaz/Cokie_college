import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { History, Volume2, Trash2 } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useInterpreter } from '../context/InterpreterContext';

export default function HistoryDrawer({ visible, onClose }) {
  const { translationHistory, speakText, clearTranslation } = useInterpreter();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <History size={15} color={Colors.primary} />
          <Text style={styles.title}>Registro de Traducciones</Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>Ocultar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {translationHistory.length === 0 ? (
          <Text style={styles.emptyText}>No hay frases traducidas aún.</Text>
        ) : (
          translationHistory.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemTextCol}>
                <Text style={styles.itemPhrase}>"{item.text}"</Text>
                <Text style={styles.itemTimestamp}>{item.timestamp}</Text>
              </View>

              <TouchableOpacity
                style={styles.repeatButton}
                onPress={() => speakText(item.text)}
                activeOpacity={0.7}
                accessibilityLabel="Repetir frase"
              >
                <Volume2 size={15} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121620',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    maxHeight: 220,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  closeBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  closeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  list: {
    maxHeight: 160,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  itemTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  itemPhrase: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
  },
  itemTimestamp: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  repeatButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
