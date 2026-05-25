-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfiles de usuario (Extiende auth.users)
CREATE TYPE user_role AS ENUM ('super_admin', 'coordinator', 'teacher', 'student');

CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    institutional_code TEXT UNIQUE,
    role user_role NOT NULL DEFAULT 'student',
    grade TEXT, -- Ej: '2', '3', etc.
    section TEXT, -- Ej: 'A', 'B', 'C'
    level TEXT, -- Ej: 'Primaria', 'Secundaria' (Para coordinadores)
    materia_principal TEXT, -- Materia que imparte el maestro
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Catálogo de Códigos de Conducta
CREATE TYPE conduct_category AS ENUM ('Positivo', 'Leve', 'Grave', 'Muy Grave');

CREATE TABLE conduct_codes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL, -- Ej: 'P01', 'L02'
    name TEXT NOT NULL,
    description TEXT,
    category conduct_category NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Registro de Conducta (Diario Pedagógico)
CREATE TABLE conduct_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    code_id UUID REFERENCES conduct_codes(id) ON DELETE RESTRICT NOT NULL,
    observation TEXT,
    period INTEGER NOT NULL, -- 1, 2, 3, 4
    fecha_aplicacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Asistencia
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'justified');

CREATE TABLE attendance (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subject_id UUID NOT NULL, -- Referencia a tabla subjects que crearemos
    status attendance_status NOT NULL DEFAULT 'present',
    period INTEGER NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Solicitudes de Justificación
CREATE TYPE justification_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE justifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    coordinator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    absence_date DATE NOT NULL,
    reason TEXT NOT NULL,
    evidence_url TEXT, -- URL de Supabase Storage
    status justification_status NOT NULL DEFAULT 'pending',
    coordinator_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Materias
CREATE TABLE subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Notas (Actualizado para incluir actividades)
CREATE TABLE evaluation_activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- Tarea Aula, Objetiva, Integradora, Formativa, Examen Final
    percentage NUMERIC(5, 2) NOT NULL, -- 10, 20, 30, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insertar actividades por defecto
INSERT INTO evaluation_activities (name, percentage) VALUES
('Tarea Aula', 10.00),
('Objetiva', 20.00),
('Integradora', 30.00),
('Formativa', 10.00),
('Examen Final', 30.00);

CREATE TABLE grades (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    activity_id UUID REFERENCES evaluation_activities(id) ON DELETE RESTRICT NOT NULL,
    grade NUMERIC(4, 2) NOT NULL DEFAULT 0.00, -- Ej: 10.00
    period INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(student_id, subject_id, activity_id, period) -- Un estudiante solo tiene una nota por actividad/materia/periodo
);

-- 10. Vista para Promedios Automáticos
CREATE VIEW student_averages AS
SELECT 
    g.student_id,
    g.subject_id,
    g.period,
    SUM(g.grade * (ea.percentage / 100)) as final_average
FROM grades g
JOIN evaluation_activities ea ON g.activity_id = ea.id
GROUP BY g.student_id, g.subject_id, g.period;

-- 11. Configuración de Storage para Justificaciones
-- (Esto debe ejecutarse en el editor SQL de Supabase)

-- Crear el bucket 'justifications' si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('justifications', 'justifications', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Los estudiantes pueden subir sus propias evidencias
CREATE POLICY "Estudiantes pueden subir evidencias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'justifications' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Los coordinadores pueden ver todas las evidencias
CREATE POLICY "Coordinadores pueden ver evidencias"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'justifications' AND 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'coordinator'
    )
);

-- Política: Los estudiantes pueden ver sus propias evidencias
CREATE POLICY "Estudiantes pueden ver sus propias evidencias"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'justifications' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 8. Horarios
CREATE TABLE schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
    grade TEXT NOT NULL,
    section TEXT NOT NULL,
    day_of_week INTEGER NOT NULL, -- 1 (Lunes) a 5 (Viernes)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Periodos Académicos (Configuración)
CREATE TABLE academic_periods (
    period_number INTEGER PRIMARY KEY, -- 1, 2, 3, 4
    start_date DATE NOT NULL,
    end_date DATE NOT NULL
);

-- Insertar periodos iniciales
INSERT INTO academic_periods (period_number, start_date, end_date) VALUES
(1, '2026-01-19', '2026-03-21'),
(2, '2026-03-22', '2026-05-31'),
(3, '2026-06-01', '2026-08-16'),
(4, '2026-08-17', '2026-10-24');

-- Insertar códigos de conducta iniciales
INSERT INTO conduct_codes (code, name, description, category) VALUES
('P01', 'Participa en clase', 'El estudiante muestra proactividad y participación constante.', 'Positivo'),
('L01', 'No presenta tarea', 'El estudiante no entrega las tareas asignadas en la fecha estipulada.', 'Leve'),
('L02', 'Se presenta con uniforme sucio', 'El estudiante no cumple con las normas de higiene del uniforme.', 'Leve'),
('G01', 'Irrespeta al compañero', 'Conducta irrespetuosa hacia sus pares.', 'Grave'),
('MG01', 'Ingresa bebidas alcohólicas a la institución', 'Falta gravísima al reglamento institucional.', 'Muy Grave');

-- RLS (Row Level Security) - Ejemplo básico
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los perfiles son visibles por todos los usuarios autenticados"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);
