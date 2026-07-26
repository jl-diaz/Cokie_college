-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- 1. TIPOS ENUM Y TABLAS PRINCIPALES
-- ========================================================

-- Perfiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'coordinator', 'teacher', 'student', 'cafetin');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    institutional_code TEXT UNIQUE,
    role user_role NOT NULL DEFAULT 'student',
    grade TEXT,
    section TEXT,
    level TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Conducta
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conduct_category') THEN
        CREATE TYPE conduct_category AS ENUM ('Positivo', 'Leve', 'Grave', 'Muy Grave');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS conduct_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category conduct_category NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS conduct_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    code_id UUID REFERENCES conduct_codes(id) ON DELETE RESTRICT NOT NULL,
    observation TEXT,
    period INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Asistencia
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'justified');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subject_id UUID NOT NULL,
    status attendance_status NOT NULL DEFAULT 'present',
    period INTEGER NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Justificaciones
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'justification_status') THEN
        CREATE TYPE justification_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS justifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    coordinator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    absence_date DATE NOT NULL,
    reason TEXT NOT NULL,
    evidence_url TEXT,
    status justification_status NOT NULL DEFAULT 'pending',
    coordinator_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Materias y Evaluaciones
CREATE TABLE IF NOT EXISTS subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS evaluation_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES evaluation_activities(id) ON DELETE RESTRICT NOT NULL,
    grade NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    period INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, subject_id, activity_id, period)
);

-- Horarios y Periodos
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS academic_periods (
    period_number INTEGER PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

-- Eventos
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    level TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Avisos
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT NOT NULL CHECK (target_role IN ('teachers', 'students', 'both')),
    level TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Notificaciones
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tickets de Grado
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_ticket_status') THEN
        CREATE TYPE grade_ticket_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS grade_extension_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    coordinator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    period INTEGER NOT NULL,
    level TEXT NOT NULL,
    reason TEXT NOT NULL,
    days_requested INTEGER NOT NULL CHECK (days_requested IN (1, 3, 7)),
    status grade_ticket_status NOT NULL DEFAULT 'pending',
    coordinator_message TEXT,
    approved_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Módulo de Cafetín
CREATE TABLE IF NOT EXISTS cafetin_menu_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafetin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('fuerte', 'acompanamiento', 'refresco')),
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS cafetin_daily_menu (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cafetin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    menu_item_id UUID REFERENCES cafetin_menu_items(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(cafetin_id, menu_item_id, date)
);

CREATE TABLE IF NOT EXISTS lunch_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    cafetin_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    fuerte_item_id UUID REFERENCES cafetin_menu_items(id) NOT NULL,
    acompanamiento1_item_id UUID REFERENCES cafetin_menu_items(id) NOT NULL,
    acompanamiento2_item_id UUID REFERENCES cafetin_menu_items(id) NOT NULL,
    tortillas_qty INTEGER NOT NULL CHECK (tortillas_qty IN (0, 1, 2)),
    refresco_item_id UUID REFERENCES cafetin_menu_items(id),
    total_price NUMERIC(6, 2) NOT NULL DEFAULT 2.50,
    status TEXT NOT NULL DEFAULT 'ordenado' CHECK (status IN ('ordenado', 'preparado', 'entregado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(user_id, date)
);

-- ========================================================
-- 2. VISTAS Y DATOS INICIALES
-- ========================================================

CREATE OR REPLACE VIEW student_averages AS
SELECT 
    g.student_id,
    g.subject_id,
    g.period,
    SUM(g.grade * (ea.percentage / 100)) as final_average
FROM grades g
JOIN evaluation_activities ea ON g.activity_id = ea.id
GROUP BY g.student_id, g.subject_id, g.period;

INSERT INTO evaluation_activities (name, percentage) VALUES
('Tarea Aula', 10.00),
('Objetiva', 20.00),
('Integradora', 30.00),
('Formativa', 10.00),
('Examen Final', 30.00)
ON CONFLICT DO NOTHING;

INSERT INTO academic_periods (period_number, start_date, end_date) VALUES
(1, '2026-01-19', '2026-03-21'),
(2, '2026-03-22', '2026-05-31'),
(3, '2026-06-01', '2026-08-16'),
(4, '2026-08-17', '2026-10-24')
ON CONFLICT (period_number) DO NOTHING;

INSERT INTO conduct_codes (code, name, description, category) VALUES
('P01', 'Participa en clase', 'El estudiante muestra proactividad y participación constante.', 'Positivo'),
('L01', 'No presenta tarea', 'El estudiante no entrega las tareas asignadas en la fecha estipulada.', 'Leve'),
('L02', 'Se presenta con uniforme sucio', 'El estudiante no cumple con las normas de higiene del uniforme.', 'Leve'),
('G01', 'Irrespeta al compañero', 'Conducta irrespetuosa hacia sus pares.', 'Grave'),
('MG01', 'Ingresa bebidas alcohólicas a la institución', 'Falta gravísima al reglamento institucional.', 'Muy Grave')
ON CONFLICT (code) DO NOTHING;

-- ========================================================
-- 3. HABILITACIÓN DE ROW LEVEL SECURITY (RLS)
-- ========================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conduct_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_extension_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafetin_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafetin_daily_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE lunch_orders ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 4. POLÍTICAS DE SEGURIDAD (RLS)
-- ========================================================

DROP POLICY IF EXISTS "Los perfiles son visibles por todos los usuarios autenticados" ON profiles;
CREATE POLICY "Los perfiles son visibles por todos los usuarios autenticados" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON profiles;
CREATE POLICY "Los usuarios pueden actualizar su propio perfil" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Lectura general autenticados conduct_records" ON conduct_records;
CREATE POLICY "Lectura general autenticados conduct_records" ON conduct_records FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados attendance" ON attendance;
CREATE POLICY "Lectura general autenticados attendance" ON attendance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados justifications" ON justifications;
CREATE POLICY "Lectura general autenticados justifications" ON justifications FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados grades" ON grades;
CREATE POLICY "Lectura general autenticados grades" ON grades FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados schedules" ON schedules;
CREATE POLICY "Lectura general autenticados schedules" ON schedules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados events" ON events;
CREATE POLICY "Lectura general autenticados events" ON events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados announcements" ON announcements;
CREATE POLICY "Lectura general autenticados announcements" ON announcements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados notifications" ON notifications;
CREATE POLICY "Lectura general autenticados notifications" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Lectura general autenticados cafetin_menu_items" ON cafetin_menu_items;
CREATE POLICY "Lectura general autenticados cafetin_menu_items" ON cafetin_menu_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados cafetin_daily_menu" ON cafetin_daily_menu;
CREATE POLICY "Lectura general autenticados cafetin_daily_menu" ON cafetin_daily_menu FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura general autenticados lunch_orders" ON lunch_orders;
CREATE POLICY "Lectura general autenticados lunch_orders" ON lunch_orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = cafetin_id);

-- ========================================================
-- 5. ÍNDICES DE RENDIMIENTO Y CONCURRENCIA
-- ========================================================

CREATE INDEX IF NOT EXISTS idx_grades_student_period ON grades(student_id, period);
CREATE INDEX IF NOT EXISTS idx_conduct_records_student_period ON conduct_records(student_id, period);
CREATE INDEX IF NOT EXISTS idx_conduct_records_teacher_period ON conduct_records(teacher_id, period);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher_date ON attendance(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_justifications_student_status ON justifications(student_id, status);
CREATE INDEX IF NOT EXISTS idx_schedules_grade_section ON schedules(grade, section);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_day ON schedules(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_cafetin_menu_items_cafetin_cat ON cafetin_menu_items(cafetin_id, category);
CREATE INDEX IF NOT EXISTS idx_cafetin_daily_menu_cafetin_date ON cafetin_daily_menu(cafetin_id, date);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_cafetin_date ON lunch_orders(cafetin_id, date);
CREATE INDEX IF NOT EXISTS idx_lunch_orders_user_date ON lunch_orders(user_id, date);
CREATE INDEX IF NOT EXISTS idx_events_level_date ON events(level, event_date);
CREATE INDEX IF NOT EXISTS idx_announcements_level_created ON announcements(level, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_role_level ON profiles(role, level);
CREATE INDEX IF NOT EXISTS idx_grade_extension_tickets_teacher_period ON grade_extension_tickets(teacher_id, period);
