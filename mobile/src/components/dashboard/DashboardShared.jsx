import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Clock, MessageSquare, ArrowUpRight } from 'lucide-react-native';

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

export function LiveClassWidget({ schedules = [], isDark = false, onPressClass }) {
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
          <View style={styles.liveClassInfo}>
            <View style={[styles.liveBadgeDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.liveClassLabel, isDark && styles.textLight]}>
              {isWeekend ? 'Fin de semana · Tiempo de descanso' : 'No hay clases programadas para hoy'}
            </Text>
          </View>
          <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(236,72,153,0.15)' : '#FCE7F3' }]}>
            <Clock size={12} color="#EC4899" />
            <Text style={[styles.timePillText, { color: '#EC4899' }]}>{isWeekend ? 'Libre' : 'Día libre'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.liveClassWrapper}>
      {/* Clase Actual */}
      <TouchableOpacity 
        style={[styles.liveClassRow, isDark && styles.liveClassRowDark, currentClass && styles.liveClassRowActive]}
        onPress={() => onPressClass && onPressClass(currentClass)}
        activeOpacity={0.85}
        disabled={!currentClass}
      >
        <View style={styles.liveClassInfo}>
          <Text style={[styles.liveClassPrefix, isDark && styles.textLight]} numberOfLines={1}>
            Tu clase actual es: <Text style={[styles.subjectHighlight, isDark && { color: '#EC4899' }]}>{currentClass ? (currentClass.subjects?.name || currentClass.name || 'Clase') : 'Ninguna en curso'}</Text>
          </Text>
        </View>
        {currentClass ? (
          <View style={styles.badgeGroup}>
            <View style={styles.gradeSectionPill}>
              <Text style={styles.gradeSectionPillText}>
                {currentClass.grade ? `${currentClass.grade}º "${currentClass.section}"` : 'En curso'}
              </Text>
            </View>
            <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(168,85,247,0.2)' : '#F3E8FF' }]}>
              <Text style={[styles.timePillText, { color: isDark ? '#C084FC' : '#7E22CE' }]}>
                {`${formatHour(currentClass.start_time)} - ${formatHour(currentClass.end_time)}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
            <Text style={[styles.timePillText, isDark && styles.textMuted]}>Sin clase activa</Text>
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
          <Text style={[styles.liveClassPrefix, isDark && styles.textLight]} numberOfLines={1}>
            Tu siguiente clase es: <Text style={[styles.subjectHighlight, isDark && { color: '#EC4899' }]}>{nextClass ? (nextClass.subjects?.name || nextClass.name || 'Clase') : 'No hay más clases hoy'}</Text>
          </Text>
        </View>
        {nextClass ? (
          <View style={styles.badgeGroup}>
            <View style={styles.gradeSectionPill}>
              <Text style={styles.gradeSectionPillText}>
                {nextClass.grade ? `${nextClass.grade}º "${nextClass.section}"` : 'Próxima'}
              </Text>
            </View>
            <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(168,85,247,0.2)' : '#F3E8FF' }]}>
              <Text style={[styles.timePillText, { color: isDark ? '#C084FC' : '#7E22CE' }]}>
                {`${formatHour(nextClass.start_time)} - ${formatHour(nextClass.end_time)}`}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
            <Text style={[styles.timePillText, isDark && styles.textMuted]}>Completado</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function StatWidget({ title, value, subtitle, trend, icon: Icon, color = '#EC4899', isDark = false, onPress }) {
  return (
    <BentoCard style={[styles.statCard, isDark && styles.cardDark]} onPress={onPress}>
      <View style={styles.statHeader}>
        <Text style={[styles.statTitle, isDark && styles.textMuted]}>{title}</Text>
        {Icon && (
          <View style={[styles.statIconBadge, { backgroundColor: color + '18' }]}>
            <Icon size={16} color={color} />
          </View>
        )}
      </View>
      <Text style={[styles.statValue, { color: color }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, isDark && styles.textMuted]}>
          {trend && <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{trend} </Text>}
          {subtitle}
        </Text>
      )}
    </BentoCard>
  );
}

export function QuickActionBtn({ title, subtitle, icon: Icon, color = '#0B1956', isDark = false, onPress }) {
  return (
    <TouchableOpacity 
      style={[styles.quickBtn, isDark && styles.quickBtnDark]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.quickBtnIcon, { backgroundColor: color + '18' }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={styles.quickBtnTextCol}>
        <Text style={[styles.quickBtnTitle, isDark && styles.textLight]} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={[styles.quickBtnSubtitle, isDark && styles.textMuted]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <ChevronRight size={16} color={isDark ? '#64748B' : '#94A3B8'} />
    </TouchableOpacity>
  );
}

export function RecentMessagesWidget({ conversations = [], isDark = false, onPressChat }) {
  const recent = (conversations || []).slice(0, 3);

  return (
    <BentoCard style={[styles.messagesCard, isDark && styles.cardDark]} onPress={onPressChat}>
      <View style={styles.messagesHeader}>
        <View style={styles.headerTitleRow}>
          <MessageSquare size={16} color="#EC4899" />
          <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>Nuevos mensajes</Text>
        </View>
        <ArrowUpRight size={16} color={isDark ? '#94A3B8' : '#64748B'} />
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
                  <Text style={[styles.messageSenderName, isDark && styles.textLight]} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.rolePill}>
                    <Text style={styles.rolePillText}>{role.replace('_', ' ')}</Text>
                  </View>
                </View>
                <Text style={[styles.messageSnippet, isDark && styles.textMuted]} numberOfLines={1}>
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
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
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
    marginBottom: 14,
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
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  liveClassRowDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  liveClassRowActive: {
    borderColor: '#EC4899',
    borderWidth: 1.5,
  },
  liveClassInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  liveClassPrefix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  liveClassLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  subjectHighlight: {
    fontWeight: '800',
    color: '#0B1956',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradeSectionPill: {
    backgroundColor: 'rgba(236,72,153,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gradeSectionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EC4899',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statCard: {
    flex: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  statSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 8,
  },
  quickBtnDark: {
    backgroundColor: '#18181B',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickBtnTextCol: {
    flex: 1,
  },
  quickBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  quickBtnSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  messagesCard: {
    padding: 16,
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyMessagesText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  messagesList: {
    gap: 8,
  },
  messageItem: {
    paddingVertical: 4,
  },
  messageBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    paddingBottom: 8,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  rolePill: {
    backgroundColor: 'rgba(236,72,153,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
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
  },
});
