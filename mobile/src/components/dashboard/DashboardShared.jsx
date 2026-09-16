import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, ArrowUpRight } from 'lucide-react-native';

export function BentoCard({ children, style, onPress, activeOpacity = 0.8 }) {
  if (onPress) {
    return (
      <TouchableOpacity 
        style={[styles.bentoCard, style]} 
        onPress={onPress} 
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.bentoCard, style]}>{children}</View>;
}

export function LiveClassWidget({ schedules = [], isDark = false, onPressClass, actionLabel = 'Ir a clase' }) {
  const now = new Date();
  const currentDay = now.getDay();
  const isWeekend = currentDay === 0 || currentDay === 6;

  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHours}:${currentMinutes}:00`;

  const todaySchedules = !isWeekend 
    ? schedules.filter(s => parseInt(s.day_of_week) === currentDay)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
    : [];

  const currentClass = todaySchedules.find(s => currentTime >= s.start_time && currentTime <= s.end_time);
  const nextClass = todaySchedules.find(s => s.start_time > currentTime);

  const formatHour = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.slice(0, 5);
  };

  if (isWeekend || todaySchedules.length === 0) {
    return (
      <View style={styles.liveClassWrapper}>
        <View style={[styles.liveClassRow, isDark && styles.liveClassRowDark]}>
          <Text style={[styles.liveClassLabel, isDark && styles.textMuted]}>
            {isWeekend ? 'Fin de semana · Sin clases programadas' : 'No tienes clases programadas hoy'}
          </Text>
          <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9' }]}>
            <Text style={[styles.timePillText, isDark && styles.textMuted]}>Libre</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.liveClassWrapper}>
      {/* Clase Actual */}
      <TouchableOpacity 
        style={[
          styles.liveClassRow, 
          isDark && styles.liveClassRowDark, 
          currentClass && (isDark ? styles.liveClassRowActiveDark : styles.liveClassRowActive)
        ]}
        onPress={() => onPressClass && onPressClass(currentClass)}
        activeOpacity={0.85}
        disabled={!currentClass}
      >
        <View style={styles.liveClassInfo}>
          <Text style={[styles.liveClassPrefix, isDark && styles.textMuted]} numberOfLines={1}>
            Clase actual:{' '}
            <Text style={[styles.subjectHighlight, isDark && styles.textLight]}>
              {currentClass ? (currentClass.subjects?.name || currentClass.name || 'Clase') : 'Ninguna'}
            </Text>
          </Text>
        </View>

        {currentClass ? (
          <View style={styles.badgeGroup}>
            <View style={[styles.gradeSectionPill, isDark && styles.gradeSectionPillDark]}>
              <Text style={[styles.gradeSectionPillText, isDark && { color: '#EC4899' }]}>
                {currentClass.grade ? `${currentClass.grade}º "${currentClass.section}"` : 'Activa'}
              </Text>
            </View>
            <View style={[styles.timePill, isDark && styles.timePillDark]}>
              <Text style={[styles.timePillText, isDark && styles.textLight]}>
                {`${formatHour(currentClass.start_time)} - ${formatHour(currentClass.end_time)}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.timePill, isDark && styles.timePillDark]}>
            <Text style={[styles.timePillText, isDark && styles.textMuted]}>Sin clase</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Siguiente Clase */}
      <TouchableOpacity 
        style={[styles.liveClassRow, isDark && styles.liveClassRowDark]}
        onPress={() => onPressClass && onPressClass(nextClass)}
        activeOpacity={0.85}
        disabled={!nextClass}
      >
        <View style={styles.liveClassInfo}>
          <Text style={[styles.liveClassPrefix, isDark && styles.textMuted]} numberOfLines={1}>
            Siguiente:{' '}
            <Text style={[styles.subjectHighlight, isDark && styles.textLight]}>
              {nextClass ? (nextClass.subjects?.name || nextClass.name || 'Clase') : 'Jornada completada'}
            </Text>
          </Text>
        </View>

        {nextClass ? (
          <View style={styles.badgeGroup}>
            <View style={[styles.gradeSectionPill, isDark && styles.gradeSectionPillDark]}>
              <Text style={[styles.gradeSectionPillText, isDark && { color: '#EC4899' }]}>
                {nextClass.grade ? `${nextClass.grade}º "${nextClass.section}"` : 'Próxima'}
              </Text>
            </View>
            <View style={[styles.timePill, isDark && styles.timePillDark]}>
              <Text style={[styles.timePillText, isDark && styles.textLight]}>
                {`${formatHour(nextClass.start_time)} - ${formatHour(nextClass.end_time)}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.timePill, isDark && styles.timePillDark]}>
            <Text style={[styles.timePillText, isDark && styles.textMuted]}>Finalizado</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function StatWidget({ title, value, subtitle, isDark = false, onPress, color = '#EC4899' }) {
  return (
    <BentoCard style={[styles.statCard, isDark && styles.cardDark]} onPress={onPress}>
      <Text style={[styles.statTitle, isDark && styles.textMuted]}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, isDark && styles.textMuted]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </BentoCard>
  );
}

export function QuickActionBtn({ title, subtitle, isDark = false, onPress }) {
  return (
    <TouchableOpacity 
      style={[styles.quickBtn, isDark && styles.quickBtnDark]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.quickBtnTextCol}>
        <Text style={[styles.quickBtnTitle, isDark && styles.textLight]} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={[styles.quickBtnSubtitle, isDark && styles.textMuted]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <ChevronRight size={15} color={isDark ? '#64748B' : '#94A3B8'} />
    </TouchableOpacity>
  );
}

export function RecentMessagesWidget({ conversations = [], isDark = false, onPressChat }) {
  const recent = (conversations || []).slice(0, 3);

  return (
    <BentoCard style={[styles.messagesCard, isDark && styles.cardDark]} onPress={onPressChat}>
      <View style={styles.messagesHeader}>
        <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>Mensajes recientes</Text>
        <ArrowUpRight size={15} color={isDark ? '#94A3B8' : '#64748B'} />
      </View>

      {recent.length === 0 ? (
        <Text style={[styles.emptyMessagesText, isDark && styles.textMuted]}>
          No tienes mensajes nuevos en CokieChat
        </Text>
      ) : (
        <View style={styles.messagesList}>
          {recent.map((conv, i) => {
            const name = conv.name || conv.other_participant?.full_name || 'Usuario';
            const role = conv.other_participant?.role || (conv.is_group ? 'grupo' : 'chat');
            const snippet = conv.last_message?.content || 'Toca para abrir la conversación...';
            
            return (
              <View key={conv.id || i} style={[styles.messageItem, i < recent.length - 1 && styles.messageBorder]}>
                <View style={styles.messageSenderRow}>
                  <Text style={[styles.messageSenderName, isDark && styles.textLight]} numberOfLines={1} ellipsizeMode="tail">
                    {name}
                  </Text>
                  <View style={[styles.rolePill, isDark && styles.rolePillDark]}>
                    <Text style={styles.rolePillText}>{role.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={[styles.messageSnippet, isDark && styles.textMuted]} numberOfLines={1} ellipsizeMode="tail">
                  {snippet}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </BentoCard>
  );
}

const styles = StyleSheet.create({
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    overflow: 'hidden',
  },
  cardDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  textLight: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#94A3B8',
  },
  liveClassWrapper: {
    gap: 8,
    marginBottom: 12,
  },
  liveClassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  liveClassRowDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  liveClassRowActive: {
    borderColor: '#EC4899',
    backgroundColor: '#FFF1F2',
  },
  liveClassRowActiveDark: {
    borderColor: '#EC4899',
    backgroundColor: '#1E1B24',
  },
  liveClassInfo: {
    flex: 1,
    marginRight: 8,
  },
  liveClassPrefix: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  liveClassLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  subjectHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  gradeSectionPill: {
    backgroundColor: 'rgba(236,72,153,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gradeSectionPillDark: {
    backgroundColor: 'rgba(236,72,153,0.2)',
  },
  gradeSectionPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EC4899',
  },
  timePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timePillDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  timePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  statCard: {
    flex: 1,
    minHeight: 90,
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 8,
  },
  quickBtnDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickBtnTextCol: {
    flex: 1,
    marginRight: 8,
  },
  quickBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  quickBtnSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  messagesCard: {
    width: '100%',
    padding: 14,
    marginBottom: 12,
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyMessagesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  messagesList: {
    gap: 8,
  },
  messageItem: {
    paddingVertical: 2,
    width: '100%',
  },
  messageBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 6,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    width: '100%',
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 6,
  },
  rolePill: {
    backgroundColor: 'rgba(236,72,153,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    flexShrink: 0,
  },
  rolePillDark: {
    backgroundColor: 'rgba(236,72,153,0.2)',
  },
  rolePillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EC4899',
    textTransform: 'capitalize',
  },
  messageSnippet: {
    fontSize: 11,
    color: '#64748B',
    width: '100%',
  },
});
