import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ChevronRight, ArrowUpRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

/**
 * Hook para animar números enteros ascendentes
 */
export function useAnimatedNumber(targetValue, duration = 1000) {
  const [currentValue, setCurrentValue] = useState(targetValue);

  useEffect(() => {
    if (targetValue === null || targetValue === undefined || targetValue === '—') {
      setCurrentValue(targetValue);
      return;
    }

    const strVal = String(targetValue).trim();
    const isDecimal = strVal.includes('.') || strVal.includes(',');
    const cleanStr = strVal.replace('%', '');

    if (isDecimal) {
      const targetFloat = parseFloat(cleanStr.replace(',', '.'));
      if (isNaN(targetFloat) || targetFloat <= 0) {
        setCurrentValue(targetValue);
        return;
      }

      const decimalPlaces = cleanStr.includes('.') ? cleanStr.split('.')[1].length : 1;
      const frameRate = 30;
      const totalFrames = Math.round((duration / 1000) * frameRate);
      let frame = 0;
      const easeOutQuad = (t) => t * (2 - t);

      const interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;
        const easedProgress = easeOutQuad(progress);
        const nextValue = (targetFloat * easedProgress).toFixed(decimalPlaces);
        setCurrentValue(strVal.includes('%') ? `${nextValue}%` : nextValue);

        if (frame >= totalFrames) {
          clearInterval(interval);
          setCurrentValue(targetValue);
        }
      }, 1000 / frameRate);

      return () => clearInterval(interval);
    }

    const target = parseInt(cleanStr, 10);
    if (isNaN(target) || target <= 0) {
      setCurrentValue(targetValue);
      return;
    }

    setCurrentValue(strVal.includes('%') ? '0%' : 0);
    const frameRate = 30;
    const totalFrames = Math.round((duration / 1000) * frameRate);
    let frame = 0;
    const easeOutQuad = (t) => t * (2 - t);

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easedProgress = easeOutQuad(progress);
      const nextValue = Math.round(target * easedProgress);
      setCurrentValue(strVal.includes('%') ? `${nextValue}%` : nextValue);

      if (frame >= totalFrames) {
        clearInterval(interval);
        setCurrentValue(targetValue);
      }
    }, 1000 / frameRate);

    return () => clearInterval(interval);
  }, [targetValue, duration]);

  return currentValue;
}

/**
 * Paletas de color Bento basadas en los ejemplos proporcionados por el usuario
 * (Colores pasteles en modo claro y bloques de contraste matizados en modo oscuro)
 */
export const BENTO_VARIANTS = {
  default: {
    light: { bg: '#FFFFFF', border: 'rgba(0,0,0,0.08)', text: '#0F172A', subtext: '#64748B', tagBg: '#F1F5F9', tagText: '#475569' },
    dark: { bg: '#18181B', border: 'rgba(255,255,255,0.08)', text: '#F8FAFC', subtext: '#94A3B8', tagBg: 'rgba(255,255,255,0.08)', tagText: '#E2E8F0' },
  },
  blue: {
    light: { bg: '#202020', border: '#2A2A30', text: '#FFFFFF', subtext: '#A1A1AA', tagBg: '#333338', tagText: '#FFFFFF', timeColor: '#F7D8FF', scheduleNumColor: '#F7D8FF' },
    dark: { bg: '#0D1E3A', border: 'rgba(59,130,246,0.3)', text: '#93C5FD', subtext: '#60A5FA', tagBg: 'rgba(59,130,246,0.2)', tagText: '#BFDBFE', timeColor: '#38BDF8', scheduleNumColor: '#38BDF8' },
  },
  black: {
    light: { bg: '#18181B', border: '#27272A', text: '#FFFFFF', subtext: '#A1A1AA', tagBg: '#3F3F46', tagText: '#FFFFFF', pillNumColor: '#FFFFFF', pillTextColor: '#FFFFFF', numColor: '#FFFFFF' },
    dark: { bg: '#09090B', border: '#27272A', text: '#FFFFFF', subtext: '#A1A1AA', tagBg: '#27272A', tagText: '#FFFFFF', pillNumColor: '#FFFFFF', pillTextColor: '#FFFFFF', numColor: '#FFFFFF' },
  },
  yellow: {
    light: { bg: '#0B1956', border: '#0B1956', text: '#FFFFFF', subtext: '#E2E8F0', tagBg: '#FEF08A', tagText: '#0B1956', pillNumColor: '#FFFFFF', pillTextColor: '#FFFFFF', numColor: '#FFFFFF' },
    dark: { bg: '#272007', border: 'rgba(234,179,8,0.3)', text: '#FFFFFF', subtext: '#FFFFFF', tagBg: 'rgba(234,179,8,0.2)', tagText: '#FFFFFF', pillNumColor: '#FFFFFF', pillTextColor: '#FFFFFF', numColor: '#FFFFFF' },
  },
  navy: {
    light: { bg: '#0B1956', border: '#0B1956', text: '#FFFFFF', subtext: '#E2E8F0', tagBg: '#FEF08A', tagText: '#0B1956', pillNumColor: '#FFFFFF', pillTextColor: '#FFFFFF', numColor: '#FFFFFF' },
    dark: { bg: '#0B1956', border: '#1E293B', text: '#FFFFFF', subtext: '#FFFFFF', tagBg: 'rgba(234,179,8,0.2)', tagText: '#FFFFFF', pillNumColor: '#FFFFFF', pillTextColor: '#FFFFFF', numColor: '#FFFFFF' },
  },
  rose: {
    light: { bg: '#FFF1F2', border: '#FECDD3', text: '#831843', subtext: '#BE185D', tagBg: '#FCE7F3', tagText: '#EC4899' },
    dark: { bg: '#290E1E', border: 'rgba(236,72,153,0.3)', text: '#FCE7F3', subtext: '#F472B6', tagBg: 'rgba(236,72,153,0.2)', tagText: '#FB7185' },
  },
  lavender: {
    light: { bg: '#F7D8FF', border: '#F7D8FF', text: '#0B1956', subtext: '#0B1956', tagBg: '#EDE9FE', tagText: '#0B1956', pillNumColor: '#0B1956', pillTextColor: '#0B1956', numColor: '#0B1956' },
    dark: { bg: '#1C1233', border: 'rgba(168,85,247,0.3)', text: '#DDD6FE', subtext: '#C084FC', tagBg: 'rgba(168,85,247,0.2)', tagText: '#E9D5FF' },
  },
  mint: {
    light: { bg: '#F0FDF4', border: '#BBF7D0', text: '#065F46', subtext: '#047857', tagBg: '#DCFCE7', tagText: '#059669' },
    dark: { bg: '#0A2417', border: 'rgba(16,185,129,0.3)', text: '#A7F3D0', subtext: '#34D399', tagBg: 'rgba(16,185,129,0.2)', tagText: '#6EE7B7' },
  },
};

/**
 * Contenedor / Ranura para imágenes o iconos
 * Permite renderizar una imagen (uri / source) o un icono de respaldo con diseño pulido
 */
export function CardImageSlot({ 
  imageUri, 
  imageSource, 
  fallbackIcon: Icon, 
  iconColor, 
  bgColor, 
  size = 46, 
  borderRadius = 14,
  style 
}) {
  return (
    <View 
      style={[
        styles.imageSlot, 
        { 
          width: size, 
          height: size, 
          borderRadius, 
          backgroundColor: bgColor || '#18181B' 
        }, 
        style
      ]}
    >
      {imageUri ? (
        <Image 
          source={{ uri: imageUri }} 
          style={{ width: '100%', height: '100%', borderRadius }} 
          resizeMode="cover" 
        />
      ) : imageSource ? (
        <Image 
          source={imageSource} 
          style={{ width: '100%', height: '100%', borderRadius }} 
          resizeMode="cover" 
        />
      ) : Icon ? (
        <Icon size={Math.round(size * 0.48)} color={iconColor || '#FFFFFF'} />
      ) : null}
    </View>
  );
}

/**
 * Contenedor Bento básico con bordes limpios y sin exceso de sombras
 */
export function BentoCard({ 
  children, 
  style, 
  onPress, 
  variant = 'default', 
  isDark = false, 
  activeOpacity = 0.8,
  borderColor
}) {
  const palette = (BENTO_VARIANTS[variant] || BENTO_VARIANTS.default)[isDark ? 'dark' : 'light'];

  const containerStyle = [
    styles.bentoCard,
    {
      backgroundColor: palette.bg,
      borderColor: borderColor || palette.border,
      borderWidth: (borderColor === 'black' || borderColor === '#000000') ? 1.5 : 1,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity 
        style={containerStyle} 
        onPress={onPress} 
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={containerStyle}>{children}</View>;
}

/**
 * Widget de Horario en Vivo (Clase actual y siguiente) con estilo Bento colorido
 */
export function LiveClassWidget({ 
  schedules = [], 
  isDark = false, 
  onPressClass, 
  placeholderIcon: Icon,
  imageUri
}) {
  const { t } = useTranslation();
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

  const palette = BENTO_VARIANTS.blue[isDark ? 'dark' : 'light'];

  if (isWeekend || todaySchedules.length === 0) {
    return (
      <BentoCard variant="default" isDark={isDark} style={styles.liveCardEmpty}>
        <View style={styles.emptyClassContent}>
          <Text style={[styles.emptyClassTitle, isDark && styles.textLight]}>
            {isWeekend ? t('dashboard.weekend', 'Fin de semana') : t('dashboard.noClassesScheduledToday', 'Sin clases programadas hoy')}
          </Text>
          <Text style={[styles.emptyClassSub, isDark && styles.textMuted]}>
            {isWeekend ? t('dashboard.enjoyRest', '¡Disfruta tu descanso!') : t('dashboard.noAssignmentsToday', 'No tienes asignaciones registradas para este día')}
          </Text>
        </View>
        <View style={[styles.timePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9' }]}>
          <Text style={[styles.timePillText, isDark ? styles.textLight : { color: '#64748B' }]}>{t('dashboard.free', 'Libre')}</Text>
        </View>
      </BentoCard>
    );
  }

  return (
    <BentoCard 
      variant="blue" 
      isDark={isDark} 
      style={styles.liveHeroCard}
      onPress={() => onPressClass && onPressClass(currentClass || nextClass)}
    >
      {/* Cabecera de la Clase Actual */}
      <View style={styles.liveCardHeader}>
        <View style={styles.livePillRow}>
          <Text style={[styles.liveStatusText, { color: palette.tagText }]}>
            {currentClass ? t('dashboard.classInProgress', 'CLASE EN CURSO') : t('dashboard.nextClass', 'PRÓXIMA CLASE')}
          </Text>
        </View>      
      </View>

      {/* Título de la Materia en curso */}
      <View style={styles.liveMainBody}>
        <Text style={[styles.liveSubjectTitle, { color: palette.text }]} numberOfLines={1}>
          {currentClass 
            ? (currentClass.subjects?.name || currentClass.name || t('dashboard.class', 'Clase')) 
            : (nextClass ? (nextClass.subjects?.name || nextClass.name || t('dashboard.class', 'Clase')) : t('dashboard.dayCompleted', 'Jornada completada'))}
        </Text>

        <View style={styles.liveDetailsRow}>
          {(currentClass?.grade || nextClass?.grade) && (
            <View style={[styles.classroomBadge, { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#F7D8FF' }]}>
              <Text style={[styles.classroomBadgeText, { color: isDark ? palette.text : '#000000' }]}>
                {currentClass 
                  ? `${currentClass.grade}º "${currentClass.section || 'A'}"` 
                  : `${nextClass.grade}º "${nextClass.section || 'A'}"`}
              </Text>
            </View>
          )}

          <View style={[styles.timeBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F7D8FF' }]}>
            <Text style={[styles.timeBadgeText, { color: isDark ? (palette.timeColor || palette.scheduleNumColor || palette.text) : '#000000' }]}>
              {currentClass 
                ? `${formatHour(currentClass.start_time)} - ${formatHour(currentClass.end_time)}`
                : (nextClass ? `${formatHour(nextClass.start_time)} - ${formatHour(nextClass.end_time)}` : t('dashboard.concluded', 'Concluido'))}
            </Text>
          </View>
        </View>
      </View>

      {/* Barra de la siguiente clase (si hay clase en curso y otra posterior) */}
      {currentClass && nextClass && (
        <View style={[styles.nextClassBar, { borderColor: isDark ? 'rgba(59,130,246,0.2)' : 'rgba(191,219,254,0.7)' }]}>
          <Text style={[styles.nextClassPrefix, { color: palette.subtext }]} numberOfLines={1}>
            {t('dashboard.next', 'Siguiente')}:{' '}
            <Text style={{ fontWeight: '700', color: palette.text }}>
              {nextClass.subjects?.name || nextClass.name}
            </Text>
          </Text>
          <Text style={[styles.nextClassTime, { color: palette.timeColor || palette.scheduleNumColor || palette.subtext }]}>
            {formatHour(nextClass.start_time)}
          </Text>
        </View>
      )}
    </BentoCard>
  );
}

/**
 * Tarjeta Bento Métrica con soporte para colores pastel y ranura de imagen/icono
 */
export function BentoStatCard({ 
  tag, 
  value, 
  subtitle, 
  variant = 'yellow', 
  isDark = false, 
  onPress,
  fallbackIcon: Icon,
  imageUri,
  borderColor,
  style
}) {
  const palette = (BENTO_VARIANTS[variant] || BENTO_VARIANTS.yellow)[isDark ? 'dark' : 'light'];
  const animatedValue = useAnimatedNumber(value);

  return (
    <BentoCard 
      variant={variant} 
      isDark={isDark} 
      borderColor={borderColor}
      style={[styles.bentoStatCard, style]} 
      onPress={onPress}
    >
      <View style={styles.statTopRow}>
        <Text style={[styles.statTagText, { color: palette.subtext }]} numberOfLines={1}>
          {tag}
        </Text>
      </View>

      <Text style={[styles.statBigValue, { color: palette.pillNumColor || palette.numColor || palette.text }]} numberOfLines={1}>
        {animatedValue}
      </Text>

      {subtitle ? (
        <Text style={[styles.statSubtitleText, { color: palette.subtext }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </BentoCard>
  );
}

/**
 * Tarjeta de Acción / Herramienta con ranura de imagen/icono a la izquierda
 * Maneja textos largos de forma impecable sin overflow
 */
export function ActionCard({ 
  title, 
  subtitle, 
  isDark = false, 
  onPress,
  fallbackIcon: Icon,
  iconColor = '#FFFFFF',
  slotBgColor,
  imageUri,
  borderColor,
  style
}) {
  return (
    <TouchableOpacity 
      style={[
        styles.actionCard, 
        { 
          backgroundColor: isDark ? '#18181B' : '#FFFFFF',
          borderColor: borderColor || (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
          borderWidth: (borderColor === 'black' || borderColor === '#000000') ? 1.5 : 1,
        },
        style
      ]} 
      onPress={onPress}
      activeOpacity={0.75}
    >
      <CardImageSlot 
        imageUri={imageUri}
        fallbackIcon={Icon}
        iconColor="#FFFFFF"
        bgColor={slotBgColor || (isDark ? '#27272A' : '#18181B')}
        size={44}
        borderRadius={14}
        style={{ marginRight: 12, flexShrink: 0 }}
      />

      <View style={styles.actionTextCol}>
        <Text 
          style={[styles.actionTitle, { color: isDark ? '#FFFFFF' : '#1E293B' }]} 
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text 
            style={[styles.actionSubtitle, { color: isDark ? '#94A3B8' : '#64748B' }]} 
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <ChevronRight size={16} color={isDark ? '#64748B' : '#94A3B8'} style={{ marginLeft: 6, flexShrink: 0 }} />
    </TouchableOpacity>
  );
}

/**
 * Tarjeta Banner Ancha (ej: Almuerzo del Día, Población Escolar)
 * Texto a la izquierda y ranura de imagen / ilustración a la derecha
 */
export function WideBannerCard({
  tag,
  title,
  subtitle,
  actionLabel,
  variant = 'rose',
  isDark = false,
  onPress,
  fallbackIcon: Icon,
  imageUri
}) {
  const palette = (BENTO_VARIANTS[variant] || BENTO_VARIANTS.rose)[isDark ? 'dark' : 'light'];

  return (
    <BentoCard
      variant={variant}
      isDark={isDark}
      style={styles.wideBannerCard}
      onPress={onPress}
    >
      <View style={styles.wideBannerTextCol}>
        {tag ? (
          <View style={[styles.wideBannerTag, { backgroundColor: palette.tagBg }]}>
            <Text style={[styles.wideBannerTagText, { color: palette.tagText }]}>{tag}</Text>
          </View>
        ) : null}

        <Text style={[styles.wideBannerTitle, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>

        {subtitle ? (
          <Text style={[styles.wideBannerSub, { color: palette.subtext }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}

        {actionLabel ? (
          <Text style={[styles.wideBannerAction, { color: palette.tagText }]}>
            {actionLabel}
          </Text>
        ) : null}
      </View>

      <CardImageSlot 
        imageUri={imageUri}
        fallbackIcon={Icon}
        iconColor={palette.text}
        bgColor={palette.tagBg}
        size={64}
        borderRadius={18}
        style={{ marginLeft: 12, flexShrink: 0 }}
      />
    </BentoCard>
  );
}

/**
 * Widget de Mensajes Recientes de CokieChat con ranuras de avatar
 */
export function RecentMessagesWidget({ conversations = [], isDark = false, onPressChat }) {
  const { t } = useTranslation();
  const incomingConversations = (conversations || []).filter(conv => {
    if (!conv.last_message) return false;
    // Si es un grupo, podríamos basarnos en sender_id no siendo nuestro ID, 
    // pero si tenemos other_participant es más seguro
    if (conv.other_participant && conv.last_message.sender_id === conv.other_participant.id) {
      return true;
    }
    // Si tiene mensajes sin leer, seguro le cayeron a él
    if (conv.unread_count && conv.unread_count > 0) {
      return true;
    }
    return false;
  });

  const recent = incomingConversations.slice(0, 3);

  return (
    <BentoCard 
      variant="default" 
      isDark={isDark} 
      style={styles.messagesCard} 
      onPress={onPressChat}
    >
      <View style={styles.messagesHeader}>
        <Text style={[styles.cardHeaderTitle, isDark && styles.textLight]}>{t('dashboard.recentMessages', 'Mensajes recientes')}</Text>
        <View style={styles.openChatPill}>
          <Text style={styles.openChatText}>CokieChat</Text>
          <ArrowUpRight size={13} color="#EC4899" />
        </View>
      </View>

      {recent.length === 0 ? (
        <Text style={[styles.emptyMessagesText, isDark && styles.textMuted]}>
          {t('dashboard.noNewMessages', 'No tienes mensajes nuevos pendientes en CokieChat')}
        </Text>
      ) : (
        <View style={styles.messagesList}>
          {recent.map((conv, i) => {
            const name = conv.name || conv.other_participant?.full_name || t('dashboard.user', 'Usuario');
            const role = conv.other_participant?.role || (conv.is_group ? 'grupo' : 'chat');
            const snippet = conv.last_message?.content || t('dashboard.tapToOpenChat', 'Toca para abrir la conversación...');
            const initial = (name[0] || 'U').toUpperCase();

            return (
              <View key={conv.id || i} style={[styles.messageItem, i < recent.length - 1 && styles.messageBorder]}>
                {/* Avatar / Ranura de imagen del remitente */}
                <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#27272A' : '#F1F5F9' }]}>
                  <Text style={[styles.avatarInitial, { color: isDark ? '#E4E4E7' : '#475569' }]}>
                    {initial}
                  </Text>
                </View>

                {/* Columna de texto */}
                <View style={styles.messageTextCol}>
                  <View style={styles.messageSenderRow}>
                    <Text 
                      style={[styles.messageSenderName, isDark && styles.textLight]} 
                      numberOfLines={1} 
                      ellipsizeMode="tail"
                    >
                      {name}
                    </Text>
                    <View style={[styles.rolePill, isDark && styles.rolePillDark]}>
                      <Text style={styles.rolePillText}>{role.replace('_', ' ')}</Text>
                    </View>
                  </View>
                  <Text 
                    style={[styles.messageSnippet, isDark && styles.textMuted]} 
                    numberOfLines={1} 
                    ellipsizeMode="tail"
                  >
                    {snippet}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </BentoCard>
  );
}

const styles = StyleSheet.create({
  imageSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bentoCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  textLight: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#94A3B8',
  },
  liveHeroCard: {
    padding: 20,
    marginBottom: 14,
  },
  liveCardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    marginBottom: 14,
  },
  emptyClassContent: {
    flex: 1,
    marginRight: 10,
  },
  emptyClassTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyClassSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  liveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  livePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  liveMainBody: {
    marginBottom: 12,
  },
  liveSubjectTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  liveDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  classroomBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  classroomBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nextClassBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  nextClassPrefix: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  nextClassTime: {
    fontSize: 14,
    fontWeight: '800',
  },
  bentoStatCard: {
    flex: 1,
    minHeight: 135,
    padding: 18,
    justifyContent: 'space-between',
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statTagText: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 6,
  },
  statBigValue: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  statSubtitleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  actionTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  wideBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    marginBottom: 14,
  },
  wideBannerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  wideBannerTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  wideBannerTagText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  wideBannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  wideBannerSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  wideBannerAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  messagesCard: {
    width: '100%',
    padding: 18,
    marginBottom: 14,
  },
  messagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  openChatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openChatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EC4899',
  },
  emptyMessagesText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  messagesList: {
    gap: 12,
  },
  messageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
  },
  messageTextCol: {
    flex: 1,
  },
  messageBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
    paddingBottom: 10,
  },
  messageSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  messageSenderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 6,
  },
  rolePill: {
    backgroundColor: 'rgba(236,72,153,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  rolePillDark: {
    backgroundColor: 'rgba(236,72,153,0.2)',
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#EC4899',
    textTransform: 'capitalize',
  },
  messageSnippet: {
    fontSize: 13,
    color: '#64748B',
  },
});
