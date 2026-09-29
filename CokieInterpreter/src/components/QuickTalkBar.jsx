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
import {
  Send,
  MessageSquare,
  Volume2,
  Heart,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Smile,
  Sparkles,
  ArrowRight,
  MessageCircle,
} from 'lucide-react-native';
import Colors from '../constants/colors';
import QuickPhrases from '../constants/quickPhrases';
import { useInterpreter } from '../context/InterpreterContext';

const ICON_MAP = {
  MessageCircle: MessageCircle,
  Heart: Heart,
  CheckCircle2: CheckCircle2,
  XCircle: XCircle,
  RotateCcw: RotateCcw,
  Smile: Smile,
  Sparkles: Sparkles,
  ArrowRight: ArrowRight,
};

export default function QuickTalkBar() {
  const { speakText } = useInterpreter();
  const [customText, setCustomText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

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
          <View style={styles.titleIconBadge}>
            <MessageSquare size={13} color="#3B82F6" />
          </View>
          <Text style={styles.sectionTitle}>Respuesta Rápida y Voz</Text>
        </View>
        <View style={styles.bidirectionalBadge}>
          <Text style={styles.bidirectionalBadgeText}>2 VÍAS</Text>
        </View>
      </View>

      {/* Chips deslizables de frases rápidas sin emojis */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {QuickPhrases.map((phrase) => {
          const IconComponent = ICON_MAP[phrase.icon] || MessageCircle;
          return (
            <TouchableOpacity
              key={phrase.id}
              style={styles.phraseChip}
              onPress={() => handleSpeakPhrase(phrase.text)}
              activeOpacity={0.75}
            >
              <View style={styles.chipIconContainer}>
                <IconComponent size={12} color="#3B82F6" />
              </View>
              <Text style={styles.chipText}>{phrase.text}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Input para escribir cualquier texto libre y que el teléfono/lentes lo hable */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.textInput, isFocused && styles.textInputFocused]}
          value={customText}
          onChangeText={setCustomText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Escribe una respuesta para reproducir en voz alta..."
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
          <Volume2 size={16} color={customText.trim() ? '#FFFFFF' : '#64748B'} strokeWidth={2.2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D1527',
    borderRadius: 20,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.22)',
    shadowColor: '#0B1956',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bidirectionalBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  bidirectionalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#60A5FA',
    letterSpacing: 0.5,
  },
  chipsScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  phraseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#111C33',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.22)',
  },
  chipIconContainer: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F1F5F9',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#131F3B',
    borderRadius: 21,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textInputFocused: {
    borderColor: '#3B82F6',
    backgroundColor: '#162344',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    shadowOpacity: 0,
    elevation: 0,
  },
});
