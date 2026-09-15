-- ==============================================================================
-- COKIECOLLEGE: SCRIPT MAESTRO DE OPTIMIZACIÓN Y SEGURIDAD (SUPABASE SQL EDITOR)
-- ==============================================================================
-- Este script es 100% IDEMPOTENTE: puede ejecutarse tantas veces como sea necesario
-- sin alterar ni duplicar datos existentes.
--
-- INSTRUCCIONES:
-- 1. Abre tu proyecto en el panel de Supabase: https://supabase.com/dashboard
-- 2. En el menú lateral izquierdo, ingresa a "SQL Editor".
-- 3. Crea una "New Query", pega todo este contenido y presiona el botón "RUN".
-- ==============================================================================

-- 1. HABILITAR EXTENSIONES CRÍTICAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CIBERSEGURIDAD: PREVENCIÓN DE ESCALADA DE PRIVILEGIOS EN PROFILES
-- ==============================================================================
-- Evita que cualquier usuario intente elevar su rol a 'super_admin' o activar cuentas
-- modificando directamente la tabla profiles mediante el cliente SDK de Supabase.

CREATE OR REPLACE FUNCTION prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Permitir modificaciones originadas desde el Backend (Service Role Key)
    IF (auth.jwt() ->> 'role') = 'service_role' OR current_setting('role', true) = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Si la petición viene de un usuario normal autenticado (anon / authenticated),
    -- bloquear cualquier intento de cambiar 'role' o 'is_active'.
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Acción denegada: No tienes permiso para modificar el rol institucional de usuario.';
    END IF;

    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'Acción denegada: No tienes permiso para modificar el estado de activación de la cuenta.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_profile_role_escalation();

-- ==============================================================================
-- 3. ÍNDICES COMPUESTOS DE ALTO RENDIMIENTO (CONCURRENCIA ESCOLAR)
-- ==============================================================================
-- Optimiza consultas frecuentes de 1,500+ usuarios concurrentes en horarios de entrada,
-- pases de lista, carga de notas y pedidos del cafetín.

-- Asistencia Escolar Diaria
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
ON attendance(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date 
ON attendance(teacher_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON attendance(date DESC);

-- Calificaciones y Periodos
CREATE INDEX IF NOT EXISTS idx_grades_student_period 
ON grades(student_id, period);

CREATE INDEX IF NOT EXISTS idx_grades_student_period_subject 
ON grades(student_id, period, subject_id);

CREATE INDEX IF NOT EXISTS idx_grade_extension_tickets_teacher_period 
ON grade_extension_tickets(teacher_id, period);

-- Diario Pedagógico y Conducta
CREATE INDEX IF NOT EXISTS idx_conduct_records_student_period 
ON conduct_records(student_id, period);

CREATE INDEX IF NOT EXISTS idx_conduct_records_teacher_period 
ON conduct_records(teacher_id, period);

CREATE INDEX IF NOT EXISTS idx_conduct_student_created 
ON conduct_records(student_id, created_at DESC);

-- Justificaciones de Inasistencia
CREATE INDEX IF NOT EXISTS idx_justifications_student_status 
ON justifications(student_id, status);

CREATE INDEX IF NOT EXISTS idx_justifications_student_date 
ON justifications(student_id, absence_date DESC);

CREATE INDEX IF NOT EXISTS idx_justifications_status_date 
ON justifications(status, absence_date DESC);

-- Horarios Semanales
CREATE INDEX IF NOT EXISTS idx_schedules_grade_section 
ON schedules(grade, section);

CREATE INDEX IF NOT EXISTS idx_schedules_grade_section_day 
ON schedules(grade, section, day_of_week);

CREATE INDEX IF NOT EXISTS idx_schedules_teacher_day 
ON schedules(teacher_id, day_of_week);

-- Notificaciones Push / Bandeja
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
ON notifications(user_id, read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- Módulo de Cafetín y Almuerzos
CREATE INDEX IF NOT EXISTS idx_cafetin_menu_items_cafetin_cat 
ON cafetin_menu_items(cafetin_id, category);

CREATE INDEX IF NOT EXISTS idx_cafetin_daily_menu_cafetin_date 
ON cafetin_daily_menu(cafetin_id, date);

CREATE INDEX IF NOT EXISTS idx_lunch_orders_cafetin_date 
ON lunch_orders(cafetin_id, date);

CREATE INDEX IF NOT EXISTS idx_lunch_orders_user_date 
ON lunch_orders(user_id, date);

-- Eventos y Circulares
CREATE INDEX IF NOT EXISTS idx_events_level_date 
ON events(level, event_date);

CREATE INDEX IF NOT EXISTS idx_announcements_level_created 
ON announcements(level, created_at DESC);

-- Perfiles de Usuario
CREATE INDEX IF NOT EXISTS idx_profiles_role_level 
ON profiles(role, level);

CREATE INDEX IF NOT EXISTS idx_profiles_role_active 
ON profiles(role, is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_grade_section 
ON profiles(grade, section) 
WHERE grade IS NOT NULL;

-- ==============================================================================
-- 4. MÓDULO COKIECHAT (TABLAS, ÍNDICES Y POLÍTICAS RLS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT,
    avatar_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
    content TEXT,
    type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'image', 'document', 'system')),
    attachment_url TEXT,
    attachment_name TEXT,
    attachment_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para CokieChat
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

-- Habilitar RLS en CokieChat
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para CokieChat
DROP POLICY IF EXISTS "Lectura participantes de conversaciones" ON conversations;
CREATE POLICY "Lectura participantes de conversaciones" ON conversations 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = conversations.id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Lectura participantes de la sala" ON conversation_participants;
CREATE POLICY "Lectura participantes de la sala" ON conversation_participants 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp 
        WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Lectura mensajes de conversaciones propias" ON messages;
CREATE POLICY "Lectura mensajes de conversaciones propias" ON messages 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Insercion de mensajes por participantes" ON messages;
CREATE POLICY "Insercion de mensajes por participantes" ON messages 
FOR INSERT TO authenticated 
WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
);

-- ==============================================================================
-- 5. VERIFICACIÓN DEL DESPLIEGUE
-- ==============================================================================
-- Esta consulta retornará el resumen de triggers e índices activos creados.

SELECT 
    'TRIGGER' AS tipo_objeto,
    trigger_name AS nombre_objeto,
    event_object_table AS tabla,
    action_timing || ' ' || event_manipulation AS detalle
FROM information_schema.triggers
WHERE trigger_name = 'trg_prevent_profile_role_escalation'

UNION ALL

SELECT 
    'INDICE' AS tipo_objeto,
    indexname AS nombre_objeto,
    tablename AS tabla,
    indexdef AS detalle
FROM pg_indexes
WHERE schemaname = 'public' 
  AND indexname IN (
    'idx_attendance_student_date',
    'idx_grades_student_period_subject',
    'idx_conduct_student_created',
    'idx_justifications_status_date',
    'idx_schedules_grade_section_day',
    'idx_notifications_user_read_created',
    'idx_lunch_orders_user_date',
    'idx_profiles_role_active',
    'idx_profiles_grade_section',
    'idx_messages_conv_created',
    'idx_conversations_last_message'
  )
ORDER BY tipo_objeto, nombre_objeto;
