-- ========================================================
-- COKIECOLLEGE: MÓDULO BIBLIOTECA (ESQUEMA, RLS Y SEMILLAS)
-- ========================================================

-- 1. Tabla de Categorías de la Biblioteca
CREATE TABLE IF NOT EXISTS book_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice único case-insensitive para prevenir categorías duplicadas
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_categories_name_lower 
ON book_categories (LOWER(name));

-- 2. Tabla de Libros
CREATE TABLE IF NOT EXISTS books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES book_categories(id) ON DELETE RESTRICT,
    cover_url TEXT,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'link')),
    resource_url TEXT NOT NULL,
    resource_name TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices de Alto Rendimiento para Búsqueda y Paginación
CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_title_lower ON books(LOWER(title));
CREATE INDEX IF NOT EXISTS idx_books_author_lower ON books(LOWER(author));

-- 4. Configuración de Row Level Security (RLS)
ALTER TABLE book_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública/autenticada para todos
DROP POLICY IF EXISTS "Lectura de categorias para todos" ON book_categories;
CREATE POLICY "Lectura de categorias para todos"
ON book_categories FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Lectura de libros para todos" ON books;
CREATE POLICY "Lectura de libros para todos"
ON books FOR SELECT
TO anon, authenticated
USING (true);

-- Políticas de gestión (crear, editar, borrar) para super_admin, admin, coordinator y teacher
DROP POLICY IF EXISTS "Gestion de categorias para administradores" ON book_categories;
CREATE POLICY "Gestion de categorias para administradores"
ON book_categories FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role::text IN ('super_admin', 'coordinator', 'admin', 'teacher')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role::text IN ('super_admin', 'coordinator', 'admin', 'teacher')
    )
);

DROP POLICY IF EXISTS "Gestion de libros para administradores" ON books;
CREATE POLICY "Gestion de libros para administradores"
ON books FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role::text IN ('super_admin', 'coordinator', 'admin', 'teacher')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role::text IN ('super_admin', 'coordinator', 'admin', 'teacher')
    )
);

-- 5. Categorías Iniciales
INSERT INTO book_categories (name)
VALUES 
    ('Literatura y Ficción'),
    ('Ciencias Naturales'),
    ('Matemáticas y Lógica'),
    ('Historia y Ciencias Sociales'),
    ('Tecnología e Informática'),
    ('Idiomas y Lenguaje'),
    ('Desarrollo Personal y Valores'),
    ('General y Referencia')
ON CONFLICT DO NOTHING;

-- 6. Libros de Muestra
DO $$
DECLARE
    lit_id UUID;
    cien_id UUID;
    tec_id UUID;
BEGIN
    SELECT id INTO lit_id FROM book_categories WHERE LOWER(name) = LOWER('Literatura y Ficción') LIMIT 1;
    SELECT id INTO cien_id FROM book_categories WHERE LOWER(name) = LOWER('Ciencias Naturales') LIMIT 1;
    SELECT id INTO tec_id FROM book_categories WHERE LOWER(name) = LOWER('Tecnología e Informática') LIMIT 1;

    IF lit_id IS NOT NULL THEN
        INSERT INTO books (title, author, description, category_id, resource_type, resource_url, cover_url)
        VALUES 
            ('El Principito', 'Antoine de Saint-Exupéry', 'Una fábula poética sobre la amistad, el amor y el sentido de la vida vista a través de los ojos de un joven príncipe.', lit_id, 'link', 'https://es.wikipedia.org/wiki/El_principito', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80')
        ON CONFLICT DO NOTHING;
    END IF;

    IF cien_id IS NOT NULL THEN
        INSERT INTO books (title, author, description, category_id, resource_type, resource_url, cover_url)
        VALUES 
            ('Breve historia del tiempo', 'Stephen Hawking', 'Un viaje fascinante desde el Big Bang hasta los agujeros negros y la naturaleza del cosmos.', cien_id, 'link', 'https://es.wikipedia.org/wiki/Breve_historia_del_tiempo', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&q=80')
        ON CONFLICT DO NOTHING;
    END IF;

    IF tec_id IS NOT NULL THEN
        INSERT INTO books (title, author, description, category_id, resource_type, resource_url, cover_url)
        VALUES 
            ('Introducción a la Programación con Python', 'Guido van Rossum', 'Fundamentos de lógica algorítmica, estructuras de datos y buenas prácticas de programación.', tec_id, 'link', 'https://docs.python.org/es/3/tutorial/', 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&q=80')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
