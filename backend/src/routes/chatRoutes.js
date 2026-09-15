const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// Todas las rutas de chat requieren estar autenticado
router.use(authenticate);

// Listar y crear conversaciones
router.get('/conversations', chatController.getConversations);
router.post('/conversations', chatController.createConversation);

// Mensajes dentro de una conversación
router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/conversations/:conversationId/messages', chatController.sendMessage);
router.post('/conversations/:conversationId/read', chatController.markAsRead);

// Contactos disponibles para iniciar chat o armar grupos
router.get('/users', chatController.getUsersForChat);

// Subida de adjuntos (imágenes y documentos)
router.post('/upload', chatController.uploadAttachment);

module.exports = router;
