const express = require('express');
const router = express.Router();
const libraryController = require('../controllers/libraryController');
const { authenticate, authorize } = require('../middleware/auth');

// Todas las rutas requieren estar autenticado
router.use(authenticate);

// --- Rutas de Lectura (Accesibles para todos los usuarios: estudiantes, docentes, coordinadores, admins) ---
router.get('/books', libraryController.getBooks);
router.get('/books/:id', libraryController.getBookById);
router.get('/categories', libraryController.getCategories);

// --- Rutas de Gestión y Escritura (super_admin, admin, coordinator y teacher) ---
const MANAGE_ROLES = ['super_admin', 'admin', 'coordinator', 'teacher'];

// Gestión de Libros
router.post('/books', authorize(MANAGE_ROLES), libraryController.createBook);
router.put('/books/:id', authorize(MANAGE_ROLES), libraryController.updateBook);
router.delete('/books/:id', authorize(MANAGE_ROLES), libraryController.deleteBook);

// Gestión de Categorías
router.post('/categories', authorize(MANAGE_ROLES), libraryController.createCategory);
router.delete('/categories/:id', authorize(MANAGE_ROLES), libraryController.deleteCategory);

// Subida de Recursos (Portadas e imágenes ≤ 10MB, Documentos PDF ≤ 50MB)
router.post('/upload', authorize(MANAGE_ROLES), libraryController.uploadResource);
router.post('/signed-upload-url', authorize(MANAGE_ROLES), libraryController.createSignedUploadUrl);

module.exports = router;
