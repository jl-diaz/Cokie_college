-- Insertar materias básicas
INSERT INTO subjects (name) VALUES
('Matemáticas'),
('Lenguaje y Literatura'),
('Ciencias Naturales'),
('Estudios Sociales'),
('Inglés'),
('Educación Física'),
('Informática'),
('Artes');

-- Nota: Para crear los coordinadores y el admin, debes hacerlo a través de la interfaz de Supabase Auth
-- o mediante el endpoint del backend para que se genere el usuario en auth.users y el perfil en profiles.

-- Instrucciones para crear el primer Super Admin:
-- 1. Ve a Supabase -> Authentication -> Users -> Add User.
-- 2. Crea un usuario con correo y contraseña.
-- 3. Copia el ID (UUID) generado.
-- 4. Ejecuta el siguiente SQL reemplazando 'TU_UUID_AQUI' y los datos:

/*
INSERT INTO profiles (id, full_name, email, institutional_code, role)
VALUES ('TU_UUID_AQUI', 'Administrador Principal', 'admin@cokiecollege.edu', 'ADMIN2026', 'super_admin');
*/

-- Configuración de Storage
-- Debes crear un bucket llamado 'justifications' en Supabase Storage y hacerlo público o configurar políticas de acceso.
