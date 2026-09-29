import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Send, MessageSquare, Volume2 } from 'lucide-react-native';
import Colors from '../constants/colors';
import QuickPhrases from '../constants/quickPhrases';
import { useInterpreter } from '../context/InterpreterContext';

export default function QuickTalkBar() {
  const { speakText } = useInterpreter();
  const [customText, setCustomText] = useState('');

  const handleSpeakPhrase = (text) => {
    speakText(text);
  };

  const handleSendCustom = () => {
    if (!customText.trim()) return;
    speakText(customText.trim());
    setCustomText('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <MessageSquare size={13} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Respuesta Rápida / Hablar en Voz Alta</Text>
        </View>
      </View>

      {/* Chips deslizables de frases rápidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {QuickPhrases.map((phrase) => (
          <TouchableOpacity
            key={phrase.id}
            style={styles.phraseChip}
            onPress={() => handleSpeakPhrase(phrase.text)}
            activeOpacity={0.75}
          >
            <Text style={styles.chipEmoji}>{phrase.emoji}</Text>
            <Text style={styles.chipText}>{phrase.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input para escribir cualquier texto libre y que el teléfono/lentes lo hable */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={customText}
          onChangeText={setCustomText}
          placeholder="Escribe algo para hablar en voz alta..."
          placeholderTextColor="#64748B"
          returnKeyType="send"
          onSubmitEditing={handleSendCustom}
        />
        <TouchableOpacity
          style={[styles.sendButton, !customText.trim() && styles.sendButtonDisabled]}
          onPress={handleSendCustom}
          disabled={!customText.trim()}
          activeOpacity={0.8}
        >
          <Volume2 size={16} color={customText.trim() ? '#0B0F17' : '#64748B'} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#121620',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  phraseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipEmoji: {
    fontSize: 13,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#1B2232',
    borderRadius: 19,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
