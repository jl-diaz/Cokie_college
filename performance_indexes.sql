-- ========================================================
-- COKIECOLLEGE: ÍNDICES DE ALTO RENDIMIENTO (100% VERIFICADO)
-- Ejecutar en Supabase SQL Editor para acelerar consultas concurrentes
-- ========================================================

-- 1. Notificaciones (Consultadas intensamente en cada cambio de vista)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- 2. Justificaciones (Filtros por estudiante, fecha de ausencia y estado)
CREATE INDEX IF NOT EXISTS idx_justifications_student_date 
ON justifications(student_id, absence_date DESC);

CREATE INDEX IF NOT EXISTS idx_justifications_status_date 
ON justifications(status, absence_date DESC);

-- 3. Asistencia Diaria (Consultada en cada cambio de clase / pase de lista)
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
ON attendance(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date 
ON attendance(teacher_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance(date DESC);

-- 4. Diario Pedagógico y Conducta (Búsquedas cronológicas por alumno)
CREATE INDEX IF NOT EXISTS idx_conduct_student_created 
ON conduct_records(student_id, created_at DESC);

-- 5. Calificaciones y Notas (Cálculo de promedios por periodo y materia)
CREATE INDEX IF NOT EXISTS idx_grades_student_period_subject 
ON grades(student_id, period, subject_id);

-- 6. Horarios Escolares (Búsquedas rápidas por grado/sección y por docente)
CREATE INDEX IF NOT EXISTS idx_schedules_grade_section_day 
ON schedules(grade, section, day_of_week);

CREATE INDEX IF NOT EXISTS idx_schedules_teacher_day 
ON schedules(teacher_id, day_of_week);

-- 7. Perfiles (Búsquedas de autenticación y listados por grado/sección)
CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
ON profiles(role, is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_grade_section 
ON profiles(grade, section) 
WHERE grade IS NOT NULL;

-- 8. CokieChat (Mensajería en tiempo real y lectura de conversaciones)
CREATE INDEX IF NOT EXISTS idx_messages_conv_created 
ON messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created 
ON messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user 
ON conversation_participants(user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_conv_participants_conv 
ON conversation_participants(conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
ON conversations(last_message_at DESC);
