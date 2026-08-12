-- ========================================================
-- RETO: Agregar fecha de nacimiento a la tabla profiles
-- Ejecutar este script en el SQL Editor de Supabase
-- ========================================================

-- Agregar la columna de fecha de nacimiento a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- (Opcional) Si deseas agregar un comentario a la columna para documentación
COMMENT ON COLUMN profiles.birth_date IS 'Fecha de nacimiento del usuario. Requerida para validación de edad según rol.';
