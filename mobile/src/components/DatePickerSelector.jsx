import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform 
} from 'react-native';
import { Calendar as CalendarIcon, ChevronDown, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Typography, BorderRadius, Spacing } from '../constants/theme';

import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * DatePickerSelector - Componente selector de fecha multiplataforma
 * Compatible con: Expo Go, Android APK, iOS y Web.
 * 
 * Props:
 * - label: string (etiqueta del campo)
 * - value: string (formato 'YYYY-MM-DD')
 * - onChange: (dateStr: string) => void
 * - minDate: string (formato 'YYYY-MM-DD', opcional)
 * - maxDate: string (formato 'YYYY-MM-DD', opcional)
 * - placeholder: string (opcional)
 * - error: string (mensaje de error en vivo, opcional)
 * - disabled: boolean (opcional)
 */
export default function DatePickerSelector({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder,
  error,
  disabled = false,
  containerStyle,
  isOpen,
  onToggle
}) {
  const { colors, theme } = useTheme();
  const { i18n } = useTranslation();
  const [internalShowPicker, setInternalShowPicker] = useState(false);
  const showNativePicker = isOpen !== undefined ? isOpen : internalShowPicker;

  const togglePicker = (val) => {
    const nextVal = typeof val === 'boolean' ? val : !showNativePicker;
    if (onToggle) {
      onToggle(nextVal);
    } else {
      setInternalShowPicker(nextVal);
    }
  };

  // Convierte un string o Date a objeto Date seguro contra desfases horarios UTC
  const parseStringToDate = (dateInput) => {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
    if (typeof dateInput === 'string') {
      const datePart = dateInput.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return new Date(y, m, d, 12, 0, 0); // Mediodía local para evitar shifts
        }
      }
    }
    const fallback = new Date(dateInput);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  };

  // Convierte objeto Date a string 'YYYY-MM-DD'
  const formatDateToString = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Formato legible localizado para el usuario
  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = parseStringToDate(dateStr);
      const isEs = (i18n.language || 'es').startsWith('es');
      return d.toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const handleNativeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      togglePicker(false);
      if (event.type === 'dismissed') return;
    }
    if (selectedDate && onChange) {
      const formatted = formatDateToString(selectedDate);
      onChange(formatted);
    }
  };

  const currentDateObj = value ? parseStringToDate(value) : new Date();
  const minDateObj = minDate ? parseStringToDate(minDate) : undefined;
  const maxDateObj = maxDate ? parseStringToDate(maxDate) : undefined;

  // Clamping seguro para evitar excepciones nativas en iOS
  let safeDateObj = currentDateObj;
  if (maxDateObj && safeDateObj > maxDateObj) {
    safeDateObj = maxDateObj;
  }
  if (minDateObj && safeDateObj < minDateObj) {
    safeDateObj = minDateObj;
  }

  const isDark = theme === 'dark';
  const borderColor = error 
    ? '#EF4444' 
    : isDark 
      ? 'rgba(255, 255, 255, 0.15)' 
      : 'rgba(0, 0, 0, 0.12)';
  const inputBg = isDark ? colors.background : '#FFFFFF';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: isDark ? colors.text.secondary : '#4A5568' }]}>
            {label}
          </Text>
        </View>
      ) : null}

      {Platform.OS === 'web' ? (
        // Renderizado optimizado para Web: Contenedor estilizado con <input type="date">
        <View 
          style={[
            styles.inputContainer,
            { 
              backgroundColor: inputBg,
              borderColor,
              opacity: disabled ? 0.6 : 1
            }
          ]}
        >
          <View style={styles.contentRow}>
            <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFF6FF' }]}>
              <CalendarIcon size={18} color={error ? '#EF4444' : colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text 
                style={[
                  styles.valueText, 
                  { 
                    color: value 
                      ? (isDark ? colors.text.primary : '#1E293B') 
                      : colors.text.muted 
                  }
                ]}
                numberOfLines={1}
              >
                {value ? formatDisplayDate(value) : (placeholder || 'YYYY-MM-DD')}
              </Text>
              {value ? (
                <Text style={[styles.rawDateText, { color: colors.text.muted }]}>
                  {value}
                </Text>
              ) : null}
            </View>
            <ChevronDown size={16} color={colors.text.muted} />
          </View>

          {/* HTML5 Date Input invisible superpuesto para click directo */}
          {!disabled && (
            <input
              type="date"
              value={value || ''}
              min={minDate || ''}
              max={maxDate || ''}
              onChange={(e) => {
                if (onChange) onChange(e.target.value);
              }}
              onClick={(e) => {
                try {
                  if (e.target && typeof e.target.showPicker === 'function') {
                    e.target.showPicker();
                  }
                } catch (err) {}
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                zIndex: 10,
                colorScheme: isDark ? 'dark' : 'light',
              }}
            />
          )}
        </View>
      ) : (
        // Renderizado para Móvil (Expo Go, Android APK, iOS): Botón nativo que abre DateTimePicker
        <>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => togglePicker(!showNativePicker)}
            style={[
              styles.inputContainer,
              { 
                backgroundColor: inputBg,
                borderColor: showNativePicker ? colors.primary : borderColor,
                opacity: disabled ? 0.6 : 1
              }
            ]}
          >
            <View style={styles.contentRow}>
              <View style={[styles.iconWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EFF6FF' }]}>
                <CalendarIcon size={18} color={error ? '#EF4444' : colors.primary} />
              </View>
              <View style={styles.textContainer}>
                <Text 
                  style={[
                    styles.valueText, 
                    { 
                      color: value 
                        ? (isDark ? colors.text.primary : '#1E293B') 
                        : colors.text.muted 
                    }
                  ]}
                  numberOfLines={1}
                >
                  {value ? formatDisplayDate(value) : (placeholder || 'Seleccionar fecha...')}
                </Text>
                {value ? (
                  <Text style={[styles.rawDateText, { color: colors.text.muted }]}>
                    {value}
                  </Text>
                ) : null}
              </View>
              <ChevronDown 
                size={16} 
                color={showNativePicker ? colors.primary : colors.text.muted} 
                style={{ transform: [{ rotate: showNativePicker ? '180deg' : '0deg' }] }}
              />
            </View>
          </TouchableOpacity>

          {showNativePicker && DateTimePicker && (
            Platform.OS === 'ios' ? (
              <View style={[
                styles.pickerContainer,
                {
                  backgroundColor: isDark ? (colors.card || '#1E293B') : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                }
              ]}>
                <View style={[
                  styles.iosPickerToolbar,
                  {
                    borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#F8FAFC'
                  }
                ]}>
                  <Text style={[styles.iosPickerToolbarTitle, { color: isDark ? colors.text.secondary : '#64748B' }]}>
                    {label ? label.replace('*', '').trim() : 'Seleccionar fecha'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => togglePicker(false)}
                    style={styles.iosDoneButton}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.iosDoneText, { color: colors.primary }]}>
                      Listo
                    </Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={safeDateObj}
                  mode="date"
                  display="spinner"
                  themeVariant={isDark ? 'dark' : 'light'}
                  textColor={isDark ? '#F8FAFC' : '#0F172A'}
                  style={{
                    backgroundColor: isDark ? (colors.card || '#1E293B') : '#FFFFFF',
                    width: '100%',
                  }}
                  minimumDate={minDateObj}
                  maximumDate={maxDateObj}
                  onChange={handleNativeChange}
                />
              </View>
            ) : (
              <DateTimePicker
                value={safeDateObj}
                mode="date"
                display="default"
                minimumDate={minDateObj}
                maximumDate={maxDateObj}
                onChange={handleNativeChange}
              />
            )
          )}
        </>
      )}

      {error ? (
        <View style={styles.errorRow}>
          <AlertCircle size={13} color="#EF4444" style={{ marginRight: 4 }} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  inputContainer: {
    position: 'relative',
    borderWidth: 1.2,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 52,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rawDateText: {
    fontSize: 11,
    marginTop: 1,
    letterSpacing: 0.5,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    paddingHorizontal: 2,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  pickerContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  iosPickerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iosPickerToolbarTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  iosDoneButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  iosDoneText: {
    fontSize: 14,
    fontWeight: '700',
  }
});
