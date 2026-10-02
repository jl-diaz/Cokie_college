const { supabaseAdmin } = require('../config/supabase');

const STORAGE_BUCKET = 'cokiechat';

/**
 * Helper para extraer la ruta de archivo en Supabase Storage a partir de su URL pública
 */
const extractStoragePath = (url, bucket = STORAGE_BUCKET) => {
    if (!url || typeof url !== 'string') return null;
    const marker = `/storage/v1/object/public/${bucket}/`;
    if (url.includes(marker)) {
        return url.split(marker)[1];
    }
    return null;
};

/**
 * Helper para limpiar archivos del Storage de forma no bloqueante
 */
const safeDeleteStorageFiles = async (urls) => {
    try {
        const paths = urls
            .map(u => extractStoragePath(u, STORAGE_BUCKET))
            .filter(Boolean);

        if (paths.length > 0) {
            await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(paths);
        }
    } catch (err) {
        console.warn('[Library Storage Cleanup Error]:', err.message);
    }
};

const libraryController = {
    /**
     * Obtener listado de libros con paginación, búsqueda por título/autor y filtro por categoría
     * Accesible para todos los usuarios autenticados
     */
    getBooks: async (req, res) => {
        try {
            const { 
                search = '', 
                category_id, 
                page = 1, 
                limit = 12 
            } = req.query;

            const pageNum = Math.max(1, parseInt(page, 10) || 1);
            const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 12));
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            let query = supabaseAdmin
                .from('books')
                .select(`
                    id,
                    title,
                    author,
                    description,
                    category_id,
                    cover_url,
                    resource_type,
                    resource_url,
                    resource_name,
                    created_at,
                    updated_at,
                    category:book_categories(id, name)
                `, { count: 'exact' });

            // Filtro por categoría (si no es 'all' ni vacío)
            if (category_id && category_id !== 'all') {
                query = query.eq('category_id', category_id);
            }

            // Búsqueda insensible a mayúsculas en título o autor
            if (search && search.trim()) {
                const term = search.trim();
                query = query.or(`title.ilike.%${term}%,author.ilike.%${term}%`);
            }

            // Ordenamiento cronológico descendente y paginación
            query = query
                .order('created_at', { ascending: false })
                .range(from, to);

            const { data: books, count, error } = await query;

            if (error) {
                console.error('Error fetching library books:', error);
                return res.status(500).json({ error: 'Error al consultar catálogo de libros' });
            }

            const total = count || 0;
            const totalPages = Math.ceil(total / limitNum) || 1;

            res.json({
                books: books || [],
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    hasMore: pageNum < totalPages
                }
            });
        } catch (error) {
            console.error('Unexpected error in getBooks:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Obtener detalle de un libro específico
     */
    getBookById: async (req, res) => {
        try {
            const { id } = req.params;

            const { data: book, error } = await supabaseAdmin
                .from('books')
                .select(`
                    id,
                    title,
                    author,
                    description,
                    category_id,
                    cover_url,
                    resource_type,
                    resource_url,
                    resource_name,
                    created_at,
                    updated_at,
                    category:book_categories(id, name)
                `)
                .eq('id', id)
                .single();

            if (error || !book) {
                return res.status(404).json({ error: 'Libro no encontrado' });
            }

            res.json(book);
        } catch (error) {
            console.error('Unexpected error in getBookById:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Obtener categorías de libros con el conteo de libros asociados a cada una
     */
    getCategories: async (req, res) => {
        try {
            const { data: categories, error } = await supabaseAdmin
                .from('book_categories')
                .select('id, name, created_at')
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching book categories:', error);
                return res.status(500).json({ error: 'Error al obtener categorías de libros' });
            }

            // Obtener conteo de libros por categoría
            const { data: bookCounts, error: countError } = await supabaseAdmin
                .from('books')
                .select('category_id');

            const countsMap = {};
            if (!countError && Array.isArray(bookCounts)) {
                bookCounts.forEach(b => {
                    countsMap[b.category_id] = (countsMap[b.category_id] || 0) + 1;
                });
            }

            const formatted = (categories || []).map(cat => ({
                id: cat.id,
                name: cat.name,
                created_at: cat.created_at,
                books_count: countsMap[cat.id] || 0
            }));

            res.json(formatted);
        } catch (error) {
            console.error('Unexpected error in getCategories:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Crear una nueva categoría
     * Solo administradores y coordinadores
     */
    createCategory: async (req, res) => {
        try {
            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
            }

            const cleanName = name.trim();

            // Validar unicidad insensible a mayúsculas
            const { data: existing } = await supabaseAdmin
                .from('book_categories')
                .select('id, name')
                .ilike('name', cleanName);

            if (existing && existing.length > 0) {
                return res.status(400).json({ error: 'Ya existe una categoría con este nombre' });
            }

            const { data: newCategory, error } = await supabaseAdmin
                .from('book_categories')
                .insert([{ name: cleanName }])
                .select()
                .single();

            if (error) {
                console.error('Error creating book category:', error);
                return res.status(500).json({ error: 'Error al guardar la categoría' });
            }

            res.status(201).json({
                ...newCategory,
                books_count: 0
            });
        } catch (error) {
            console.error('Unexpected error in createCategory:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Eliminar categoría
     * Si contiene libros asociados, se bloquea la eliminación para proteger la integridad del catálogo
     */
    deleteCategory: async (req, res) => {
        try {
            const { id } = req.params;

            // 1. Verificar si existen libros asociados a esta categoría
            const { count, error: countError } = await supabaseAdmin
                .from('books')
                .select('id', { count: 'exact', head: true })
                .eq('category_id', id);

            if (countError) {
                console.error('Error checking category books:', countError);
                return res.status(500).json({ error: 'Error al verificar dependencias de la categoría' });
            }

            if (count && count > 0) {
                return res.status(400).json({ 
                    error: `No se puede eliminar la categoría porque contiene ${count} libro(s) asociado(s). Reasigna o elimina los libros primero.`,
                    books_count: count
                });
            }

            // 2. Proceder a eliminar la categoría
            const { error: deleteError } = await supabaseAdmin
                .from('book_categories')
                .delete()
                .eq('id', id);

            if (deleteError) {
                console.error('Error deleting book category:', deleteError);
                return res.status(500).json({ error: 'Error al eliminar la categoría' });
            }

            res.json({ success: true, message: 'Categoría eliminada exitosamente' });
        } catch (error) {
            console.error('Unexpected error in deleteCategory:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Generar URL firmada para subida directa desde el cliente a Supabase Storage
     * Evita el límite de 4.5MB de Vercel y procesa archivos grandes sin saturar memoria
     */
    createSignedUploadUrl: async (req, res) => {
        try {
            const { filename, mimeType, resourceType = 'pdf' } = req.body;
            if (!filename) {
                return res.status(400).json({ error: 'El nombre de archivo es obligatorio' });
            }
            const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const subfolder = resourceType === 'pdf' ? 'library/pdfs' : 'library/covers';
            const filePath = `${subfolder}/${Date.now()}_${cleanName}`;

            const { data, error } = await supabaseAdmin
                .storage
                .from(STORAGE_BUCKET)
                .createSignedUploadUrl(filePath);

            if (error || !data) {
                console.error('Error generating signed upload URL:', error);
                return res.status(500).json({ error: 'Error al generar enlace seguro de subida' });
            }

            const { data: publicData } = supabaseAdmin
                .storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(filePath);

            res.json({
                signedUrl: data.signedUrl,
                token: data.token,
                path: filePath,
                publicUrl: publicData.publicUrl
            });
        } catch (error) {
            console.error('Unexpected error in createSignedUploadUrl:', error);
            res.status(500).json({ error: 'Error interno del servidor al crear URL firmada' });
        }
    },

    /**
     * Subida segura de portadas de libros y documentos PDF a Supabase Storage
     * Valida tipos MIME, extensiones y límites de tamaño (Imágenes ≤ 10MB, PDF ≤ 50MB)
     */
    uploadResource: async (req, res) => {
        try {
            const { base64, filename, mimeType, resourceType = 'cover' } = req.body;

            if (!base64 || !filename) {
                return res.status(400).json({ error: 'Base64 y filename son obligatorios' });
            }

            const ext = (filename.split('.').pop() || 'bin').toLowerCase();

            // Bloqueo estricto de ejecutables o scripts
            const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'php', 'vbs', 'msi', 'scr', 'com', 'pif', 'jar', 'apk'];
            if (BLOCKED_EXTENSIONS.includes(ext)) {
                return res.status(400).json({ error: 'Extensión de archivo prohibida por seguridad.' });
            }

            let buffer;
            try {
                const b64Data = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
                buffer = Buffer.from(b64Data, 'base64');
            } catch {
                return res.status(400).json({ error: 'Formato base64 inválido' });
            }

            // Validaciones según el tipo de recurso
            if (resourceType === 'pdf') {
                if (ext !== 'pdf' && !mimeType?.includes('pdf')) {
                    return res.status(400).json({ error: 'El archivo debe ser un documento PDF válido' });
                }
                const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB
                if (buffer.length > MAX_PDF_SIZE) {
                    return res.status(400).json({ error: 'El documento PDF excede el tamaño máximo permitido (50 MB)' });
                }
            } else {
                // Portada
                const ALLOWED_IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
                if (!ALLOWED_IMG_EXTS.includes(ext) && !mimeType?.startsWith('image/')) {
                    return res.status(400).json({ error: 'La portada debe ser una imagen válida (JPG, PNG o WEBP)' });
                }
                const MAX_IMG_SIZE = 10 * 1024 * 1024; // 10 MB
                if (buffer.length > MAX_IMG_SIZE) {
                    return res.status(400).json({ error: 'La imagen de portada excede el tamaño máximo permitido (5 MB)' });
                }
            }

            const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const subfolder = resourceType === 'pdf' ? 'library/pdfs' : 'library/covers';
            const filePath = `${subfolder}/${Date.now()}_${cleanName}`;

            const { data: uploadData, error: uploadError } = await supabaseAdmin
                .storage
                .from(STORAGE_BUCKET)
                .upload(filePath, buffer, {
                    contentType: mimeType || (resourceType === 'pdf' ? 'application/pdf' : 'image/jpeg'),
                    upsert: true
                });

            if (uploadError || !uploadData) {
                console.error('Error uploading library file to storage:', uploadError);
                return res.status(500).json({ error: 'Error al almacenar el archivo en la nube' });
            }

            const { data: publicData } = supabaseAdmin
                .storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(filePath);

            res.json({
                url: publicData.publicUrl,
                filename,
                size: buffer.length
            });
        } catch (error) {
            console.error('Unexpected error in uploadResource:', error);
            res.status(500).json({ error: 'Error interno del servidor en la subida de archivo' });
        }
    },

    /**
     * Crear libro
     * Solo administradores y coordinadores
     */
    createBook: async (req, res) => {
        try {
            const {
                title,
                author,
                description,
                category_id,
                cover_url,
                resource_type,
                resource_url,
                resource_name
            } = req.body;

            // Validaciones de obligatoriedad
            if (!title || !title.trim()) {
                return res.status(400).json({ error: 'El título del libro es obligatorio' });
            }
            if (!author || !author.trim()) {
                return res.status(400).json({ error: 'El autor del libro es obligatorio' });
            }
            if (!description || !description.trim()) {
                return res.status(400).json({ error: 'La descripción del libro es obligatoria' });
            }
            if (!category_id) {
                return res.status(400).json({ error: 'Debe seleccionar una categoría' });
            }
            if (!['pdf', 'link'].includes(resource_type)) {
                return res.status(400).json({ error: 'El tipo de recurso debe ser "pdf" o "link"' });
            }
            if (!resource_url || !resource_url.trim()) {
                return res.status(400).json({ error: 'El recurso (PDF o enlace) es obligatorio' });
            }

            // Validar que enlaces externos solo permitan http:// o https://
            if (resource_type === 'link') {
                const trimmedUrl = resource_url.trim().toLowerCase();
                if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
                    return res.status(400).json({ error: 'El enlace externo debe comenzar con http:// o https://' });
                }
            }

            // Verificar existencia de la categoría
            const { data: catExists } = await supabaseAdmin
                .from('book_categories')
                .select('id')
                .eq('id', category_id)
                .single();

            if (!catExists) {
                return res.status(400).json({ error: 'La categoría seleccionada no existe' });
            }

            const { data: newBook, error: insertError } = await supabaseAdmin
                .from('books')
                .insert([{
                    title: title.trim(),
                    author: author.trim(),
                    description: description.trim(),
                    category_id,
                    cover_url: cover_url ? cover_url.trim() : null,
                    resource_type,
                    resource_url: resource_url.trim(),
                    resource_name: resource_name ? resource_name.trim() : null,
                    created_by: req.user.id
                }])
                .select(`
                    id,
                    title,
                    author,
                    description,
                    category_id,
                    cover_url,
                    resource_type,
                    resource_url,
                    resource_name,
                    created_at,
                    updated_at,
                    category:book_categories(id, name)
                `)
                .single();

            if (insertError) {
                console.error('Error inserting book:', insertError);
                return res.status(500).json({ error: 'Error al registrar el libro en la base de datos' });
            }

            res.status(201).json(newBook);
        } catch (error) {
            console.error('Unexpected error in createBook:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Actualizar libro
     * Si cambia el PDF o la portada, elimina el archivo anterior para no dejar archivos huérfanos
     */
    updateBook: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                title,
                author,
                description,
                category_id,
                cover_url,
                resource_type,
                resource_url,
                resource_name
            } = req.body;

            // 1. Obtener datos actuales del libro para comparar archivos a limpiar
            const { data: currentBook, error: findError } = await supabaseAdmin
                .from('books')
                .select('*')
                .eq('id', id)
                .single();

            if (findError || !currentBook) {
                return res.status(404).json({ error: 'Libro no encontrado' });
            }

            // Validaciones
            if (title !== undefined && !title.trim()) {
                return res.status(400).json({ error: 'El título no puede estar vacío' });
            }
            if (author !== undefined && !author.trim()) {
                return res.status(400).json({ error: 'El autor no puede estar vacío' });
            }
            if (description !== undefined && !description.trim()) {
                return res.status(400).json({ error: 'La descripción no puede estar vacía' });
            }
            if (resource_type !== undefined && !['pdf', 'link'].includes(resource_type)) {
                return res.status(400).json({ error: 'El tipo de recurso debe ser "pdf" o "link"' });
            }
            if (resource_type === 'link' && resource_url) {
                const trimmedUrl = resource_url.trim().toLowerCase();
                if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
                    return res.status(400).json({ error: 'El enlace externo debe comenzar con http:// o https://' });
                }
            }

            // Detectar archivos anteriores a eliminar para evitar huérfanos
            const filesToDelete = [];

            // Si cambió la portada y la anterior estaba en Supabase Storage
            if (cover_url !== undefined && cover_url !== currentBook.cover_url && currentBook.cover_url) {
                filesToDelete.push(currentBook.cover_url);
            }

            // Si cambió el recurso o tipo y el anterior era PDF alojado en Supabase Storage
            if (
                currentBook.resource_type === 'pdf' && 
                currentBook.resource_url && 
                (resource_url !== currentBook.resource_url || resource_type !== 'pdf')
            ) {
                filesToDelete.push(currentBook.resource_url);
            }

            const updatePayload = {
                updated_at: new Date().toISOString()
            };
            if (title !== undefined) updatePayload.title = title.trim();
            if (author !== undefined) updatePayload.author = author.trim();
            if (description !== undefined) updatePayload.description = description.trim();
            if (category_id !== undefined) updatePayload.category_id = category_id;
            if (cover_url !== undefined) updatePayload.cover_url = cover_url ? cover_url.trim() : null;
            if (resource_type !== undefined) updatePayload.resource_type = resource_type;
            if (resource_url !== undefined) updatePayload.resource_url = resource_url.trim();
            if (resource_name !== undefined) updatePayload.resource_name = resource_name ? resource_name.trim() : null;

            const { data: updatedBook, error: updateError } = await supabaseAdmin
                .from('books')
                .update(updatePayload)
                .eq('id', id)
                .select(`
                    id,
                    title,
                    author,
                    description,
                    category_id,
                    cover_url,
                    resource_type,
                    resource_url,
                    resource_name,
                    created_at,
                    updated_at,
                    category:book_categories(id, name)
                `)
                .single();

            if (updateError) {
                console.error('Error updating book:', updateError);
                return res.status(500).json({ error: 'Error al actualizar el libro' });
            }

            // Limpieza en segundo plano de archivos anteriores reemplazados
            if (filesToDelete.length > 0) {
                safeDeleteStorageFiles(filesToDelete);
            }

            res.json(updatedBook);
        } catch (error) {
            console.error('Unexpected error in updateBook:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Eliminar libro y sus archivos asociados en Storage
     */
    deleteBook: async (req, res) => {
        try {
            const { id } = req.params;

            const { data: book, error: findError } = await supabaseAdmin
                .from('books')
                .select('cover_url, resource_type, resource_url')
                .eq('id', id)
                .single();

            if (findError || !book) {
                return res.status(404).json({ error: 'Libro no encontrado' });
            }

            const { error: deleteError } = await supabaseAdmin
                .from('books')
                .delete()
                .eq('id', id);

            if (deleteError) {
                console.error('Error deleting book:', deleteError);
                return res.status(500).json({ error: 'Error al eliminar el libro' });
            }

            // Limpiar portada y PDF del almacenamiento para no dejar archivos huérfanos
            const filesToDelete = [];
            if (book.cover_url) filesToDelete.push(book.cover_url);
            if (book.resource_type === 'pdf' && book.resource_url) filesToDelete.push(book.resource_url);

            if (filesToDelete.length > 0) {
                safeDeleteStorageFiles(filesToDelete);
            }

            res.json({ success: true, message: 'Libro eliminado exitosamente' });
        } catch (error) {
            console.error('Unexpected error in deleteBook:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = libraryController;
