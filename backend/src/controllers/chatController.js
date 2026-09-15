const { supabaseAdmin } = require('../config/supabase');
const { sendNotification } = require('../utils/notificationService');
const { decryptMessage } = require('../utils/chatCrypto');

const chatController = {
    /**
     * Obtener listado de conversaciones del usuario autenticado
     */
    getConversations: async (req, res) => {
        try {
            const userId = req.user.id;
            const { role_filter, search } = req.query || {};

            // 1. Obtener todas las conversaciones donde el usuario es participante
            const { data: participations, error: partError } = await supabaseAdmin
                .from('conversation_participants')
                .select('conversation_id, role, last_read_at, joined_at')
                .eq('user_id', userId);

            if (partError) {
                // Si la tabla no existe aún, retornar arreglo vacío para no romper la app
                if (partError.code === 'PGRST205' || partError.message?.includes('schema cache')) {
                    return res.json([]);
                }
                throw partError;
            }

            if (!participations || participations.length === 0) {
                return res.json([]);
            }

            const conversationIds = participations.map(p => p.conversation_id);

            // 2. Obtener metadatos de las conversaciones
            let convQuery = supabaseAdmin
                .from('conversations')
                .select('*')
                .in('id', conversationIds)
                .order('last_message_at', { ascending: false });

            if (search) {
                convQuery = convQuery.ilike('name', `%${search}%`);
            }

            const { data: conversations, error: convError } = await convQuery;
            if (convError) throw convError;

            // 3. Obtener participantes de todas estas conversaciones para saber con quién se habla
            const { data: allParticipants, error: allPartsError } = await supabaseAdmin
                .from('conversation_participants')
                .select('conversation_id, user_id, role, last_read_at')
                .in('conversation_id', conversationIds);

            if (allPartsError) throw allPartsError;

            // Obtener perfiles de los demás participantes
            const otherUserIds = [...new Set((allParticipants || [])
                .filter(p => p.user_id !== userId)
                .map(p => p.user_id))];

            let profilesMap = {};
            if (otherUserIds.length > 0) {
                const { data: profilesData } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, role, level, grade, section, institutional_code')
                    .in('id', otherUserIds);

                (profilesData || []).forEach(p => {
                    profilesMap[p.id] = p;
                });
            }

            // 4. Obtener último mensaje de cada conversación y conteo de no leídos
            const results = await Promise.all((conversations || []).map(async (conv) => {
                const myParticipation = participations.find(p => p.conversation_id === conv.id);
                const lastRead = myParticipation?.last_read_at || '1970-01-01T00:00:00Z';

                // Último mensaje
                const { data: lastMsgs } = await supabaseAdmin
                    .from('messages')
                    .select('*')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: false })
                    .limit(1);

                const lastMsg = lastMsgs && lastMsgs.length > 0 ? lastMsgs[0] : null;

                // Conteo de mensajes no leídos
                const { count: unreadCount } = await supabaseAdmin
                    .from('messages')
                    .select('id', { count: 'exact', head: true })
                    .eq('conversation_id', conv.id)
                    .gt('created_at', lastRead)
                    .neq('sender_id', userId);

                // Determinar título y avatar de la conversación
                const convParts = (allParticipants || []).filter(p => p.conversation_id === conv.id);
                const otherPart = convParts.find(p => p.user_id !== userId);
                const otherProfile = otherPart ? profilesMap[otherPart.user_id] : null;

                let title = conv.name;
                let avatarUrl = conv.avatar_url;
                let recipientRole = null;
                let recipientLevel = null;
                let recipientInfo = null;

                if (conv.type === 'direct') {
                    title = otherProfile ? otherProfile.full_name : 'Usuario';
                    recipientRole = otherProfile ? otherProfile.role : 'member';
                    recipientLevel = otherProfile ? (otherProfile.level || (otherProfile.grade ? `${otherProfile.grade}º ${otherProfile.section || ''}` : '')) : '';
                    recipientInfo = otherProfile;
                }

                // Generar vista previa del mensaje (descifrado para listado)
                let lastMessagePreview = 'Sin mensajes aún';
                if (lastMsg) {
                    if (lastMsg.type === 'image') lastMessagePreview = '📷 Imagen adjunta';
                    else if (lastMsg.type === 'document') lastMessagePreview = `📄 ${lastMsg.attachment_name || 'Documento adjunto'}`;
                    else lastMessagePreview = decryptMessage(lastMsg.content) || '';
                }

                return {
                    id: conv.id,
                    type: conv.type,
                    title,
                    name: conv.name,
                    avatar_url: avatarUrl,
                    last_message: lastMessagePreview,
                    last_message_at: lastMsg?.created_at || conv.last_message_at || conv.created_at,
                    unread_count: unreadCount || 0,
                    recipient: recipientInfo,
                    recipient_role: recipientRole,
                    recipient_level: recipientLevel,
                    participants_count: convParts.length,
                    is_group: conv.type === 'group',
                    my_role: myParticipation?.role || 'member'
                };
            }));

            // Aplicar filtros de rol si se solicitan
            let filteredResults = results;
            if (role_filter && role_filter !== 'all') {
                if (role_filter === 'group') {
                    filteredResults = filteredResults.filter(r => r.is_group);
                } else {
                    filteredResults = filteredResults.filter(r => !r.is_group && r.recipient_role === role_filter);
                }
            }

            // Filtro de búsqueda por texto en título o último mensaje
            if (search && search.trim()) {
                const q = search.toLowerCase().trim();
                filteredResults = filteredResults.filter(r => 
                    r.title?.toLowerCase().includes(q) || 
                    r.last_message?.toLowerCase().includes(q)
                );
            }

            res.json(filteredResults);
        } catch (error) {
            console.error('Error en getConversations:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Crear o abrir conversación directa o grupal
     */
    createConversation: async (req, res) => {
        try {
            const userId = req.user.id;
            const { type = 'direct', recipient_id, name, participant_ids, avatar_url } = req.body;

            if (type === 'direct') {
                if (!recipient_id) {
                    return res.status(400).json({ error: 'recipient_id es requerido para chat directo' });
                }
                if (recipient_id === userId) {
                    return res.status(400).json({ error: 'No puedes iniciar un chat contigo mismo' });
                }

                // 1. Verificar si ya existe conversación directa entre ambos
                const { data: myConvs } = await supabaseAdmin
                    .from('conversation_participants')
                    .select('conversation_id')
                    .eq('user_id', userId);

                const convIds = (myConvs || []).map(c => c.conversation_id);

                if (convIds.length > 0) {
                    const { data: existingPart } = await supabaseAdmin
                        .from('conversation_participants')
                        .select('conversation_id, conversations!inner(id, type)')
                        .in('conversation_id', convIds)
                        .eq('user_id', recipient_id)
                        .eq('conversations.type', 'direct')
                        .limit(1);

                    if (existingPart && existingPart.length > 0) {
                        const existingId = existingPart[0].conversation_id;
                        return res.json({ id: existingId, existing: true });
                    }
                }

                // 2. Crear nueva conversación directa
                const { data: newConv, error: convError } = await supabaseAdmin
                    .from('conversations')
                    .insert([{
                        type: 'direct',
                        created_by: userId,
                        last_message_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (convError) throw convError;

                // 3. Agregar ambos participantes
                await supabaseAdmin
                    .from('conversation_participants')
                    .insert([
                        { conversation_id: newConv.id, user_id: userId, role: 'member' },
                        { conversation_id: newConv.id, user_id: recipient_id, role: 'member' }
                    ]);

                return res.status(201).json({ id: newConv.id, existing: false });
            } else if (type === 'group') {
                if (!name || !name.trim()) {
                    return res.status(400).json({ error: 'El nombre del grupo es obligatorio' });
                }

                if (!participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
                    return res.status(400).json({ error: 'Debes añadir al menos un participante adicional al grupo' });
                }

                // 1. Crear conversación grupal
                const { data: newConv, error: convError } = await supabaseAdmin
                    .from('conversations')
                    .insert([{
                        type: 'group',
                        name: name.trim(),
                        avatar_url: avatar_url || null,
                        created_by: userId,
                        last_message_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (convError) throw convError;

                // 2. Armar lista única de participantes incluyendo al creador como admin
                const uniqueIds = [...new Set([userId, ...participant_ids])];
                const participantRows = uniqueIds.map(uid => ({
                    conversation_id: newConv.id,
                    user_id: uid,
                    role: uid === userId ? 'admin' : 'member'
                }));

                await supabaseAdmin
                    .from('conversation_participants')
                    .insert(participantRows);

                // 3. Crear mensaje de sistema de bienvenida
                await supabaseAdmin
                    .from('messages')
                    .insert([{
                        conversation_id: newConv.id,
                        sender_id: userId,
                        content: `Grupo "${name.trim()}" creado por ${req.user.full_name || 'un coordinador'}.`,
                        type: 'system'
                    }]);

                return res.status(201).json({ id: newConv.id, name: newConv.name, is_group: true });
            } else {
                return res.status(400).json({ error: 'Tipo de conversación inválido' });
            }
        } catch (error) {
            console.error('Error en createConversation:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Obtener mensajes de una conversación
     */
    getMessages: async (req, res) => {
        try {
            const userId = req.user.id;
            const conversationId = req.params.conversationId || req.params.id;

            // 1. Verificar autorización: el usuario DEBE ser participante
            const { data: participation, error: partError } = await supabaseAdmin
                .from('conversation_participants')
                .select('id, role')
                .eq('conversation_id', conversationId)
                .eq('user_id', userId)
                .single();

            if (partError || !participation) {
                return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
            }

            // 2. Obtener conversación para metadatos
            const { data: conversation } = await supabaseAdmin
                .from('conversations')
                .select('*')
                .eq('id', conversationId)
                .single();

            // 3. Obtener los mensajes ordenados cronológicamente
            const { data: messages, error: msgError } = await supabaseAdmin
                .from('messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .limit(200);

            if (msgError) throw msgError;

            // 4. Obtener perfiles de remitentes
            const senderIds = [...new Set((messages || []).map(m => m.sender_id).filter(Boolean))];
            let senderMap = {};
            if (senderIds.length > 0) {
                const { data: senders } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name, role, level, grade, section')
                    .in('id', senderIds);

                (senders || []).forEach(s => {
                    senderMap[s.id] = s;
                });
            }

            // 5. Actualizar timestamp de lectura del usuario actual y obtener participantes
            const now = new Date().toISOString();
            await supabaseAdmin
                .from('conversation_participants')
                .update({ last_read_at: now })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            const { data: convParticipants } = await supabaseAdmin
                .from('conversation_participants')
                .select('user_id, role, last_read_at')
                .eq('conversation_id', conversationId);

            // 6. Formatear mensajes
            const formattedMessages = (messages || []).map(m => ({
                id: m.id,
                conversation_id: m.conversation_id,
                sender_id: m.sender_id,
                content: m.content,
                type: m.type,
                attachment_url: m.attachment_url,
                attachment_name: m.attachment_name,
                attachment_size: m.attachment_size,
                created_at: m.created_at,
                is_mine: m.sender_id === userId,
                sender: senderMap[m.sender_id] || { full_name: 'Usuario' }
            }));

            res.json({
                conversation,
                messages: formattedMessages,
                participants: convParticipants || []
            });
        } catch (error) {
            console.error('Error en getMessages:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Marcar conversación como leída explícitamente
     */
    markAsRead: async (req, res) => {
        try {
            const userId = req.user.id;
            const conversationId = req.params.conversationId || req.params.id;
            const now = new Date().toISOString();

            const { error } = await supabaseAdmin
                .from('conversation_participants')
                .update({ last_read_at: now })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            if (error) throw error;
            res.json({ success: true, last_read_at: now });
        } catch (error) {
            console.error('Error en markAsRead:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Enviar mensaje (texto, imagen, documento)
     */
    sendMessage: async (req, res) => {
        try {
            const userId = req.user.id;
            const senderName = req.user.full_name || 'Colega';
            const conversationId = req.params.conversationId || req.params.id;
            const { content, type = 'text', attachment_url, attachment_name, attachment_size } = req.body;

            // 1. Verificar autorización del remitente
            const { data: participation, error: partError } = await supabaseAdmin
                .from('conversation_participants')
                .select('id')
                .eq('conversation_id', conversationId)
                .eq('user_id', userId)
                .single();

            if (partError || !participation) {
                return res.status(403).json({ error: 'No tienes permiso para enviar mensajes en esta conversación' });
            }

            // 2. Validación de contenido
            if ((!content || !content.trim()) && !attachment_url) {
                return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
            }

            // 3. Insertar mensaje
            const { data: newMsg, error: insertError } = await supabaseAdmin
                .from('messages')
                .insert([{
                    conversation_id: conversationId,
                    sender_id: userId,
                    content: content ? content.trim() : null,
                    type: type || 'text',
                    attachment_url: attachment_url || null,
                    attachment_name: attachment_name || null,
                    attachment_size: attachment_size || null
                }])
                .select()
                .single();

            if (insertError) throw insertError;

            // 4. Actualizar fecha de último mensaje en la conversación y lectura del emisor
            const now = new Date().toISOString();
            await supabaseAdmin
                .from('conversations')
                .update({ last_message_at: now })
                .eq('id', conversationId);

            await supabaseAdmin
                .from('conversation_participants')
                .update({ last_read_at: now })
                .eq('conversation_id', conversationId)
                .eq('user_id', userId);

            // 5. Enviar notificaciones PUSH e in-app a los demás participantes
            const { data: otherParticipants } = await supabaseAdmin
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conversationId)
                .neq('user_id', userId);

            if (otherParticipants && otherParticipants.length > 0) {
                const { data: convInfo } = await supabaseAdmin
                    .from('conversations')
                    .select('type, name')
                    .eq('id', conversationId)
                    .single();

                let notifTitle = senderName;
                if (convInfo?.type === 'group') {
                    notifTitle = `💬 ${convInfo.name || 'Grupo'}`;
                }

                let rawText = content ? decryptMessage(content).trim() : '';
                let previewText = rawText;
                if (type === 'image') previewText = '📷 Foto adjunta';
                if (type === 'document') previewText = `📄 ${attachment_name || 'Documento adjunto'}`;
                if (convInfo?.type === 'group') previewText = `${senderName}: ${previewText}`;

                // Despacho no bloqueante de notificaciones
                for (const p of otherParticipants) {
                    sendNotification(
                        p.user_id,
                        notifTitle,
                        previewText.substring(0, 120),
                        { type: 'chat', conversation_id: conversationId }
                    ).catch(e => console.error('Error enviando notificación push de chat:', e));
                }
            }

            res.status(201).json({
                ...newMsg,
                is_mine: true,
                sender: {
                    id: userId,
                    full_name: senderName,
                    role: req.user.role
                }
            });
        } catch (error) {
            console.error('Error en sendMessage:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Listar contactos institucionales disponibles para iniciar chat o grupo
     */
    getUsersForChat: async (req, res) => {
        try {
            const userId = req.user.id;
            const { search, role } = req.query || {};

            let query = supabaseAdmin
                .from('profiles')
                .select('id, full_name, role, institutional_code, grade, section, level')
                .eq('is_active', true)
                .neq('id', userId)
                .order('full_name', { ascending: true });

            if (role && role !== 'all') {
                query = query.eq('role', role);
            }

            if (search && search.trim()) {
                const q = search.trim();
                query = query.or(`full_name.ilike.%${q}%,institutional_code.ilike.%${q}%`);
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;

            res.json(data || []);
        } catch (error) {
            console.error('Error en getUsersForChat:', error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Subida segura de adjuntos (imágenes y documentos)
     */
    uploadAttachment: async (req, res) => {
        try {
            const { base64, filename, mimeType } = req.body;
            if (!base64 || !filename) {
                return res.status(400).json({ error: 'Base64 y filename son obligatorios' });
            }

            // Normalizar extensión y path
            const ext = (filename.split('.').pop() || 'bin').toLowerCase();
            
            // Ciberseguridad: Bloquear extensiones ejecutables o de script maliciosas
            const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'php', 'vbs', 'msi', 'scr', 'com', 'pif', 'application', 'gadget', 'jar', 'apk'];
            if (BLOCKED_EXTENSIONS.includes(ext)) {
                return res.status(400).json({ 
                    error: 'Tipo de archivo no permitido por políticas de ciberseguridad escolar.' 
                });
            }

            const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `attachments/${Date.now()}_${cleanName}`;

            // Intentar subir a Supabase Storage bucket 'cokiechat'
            let buffer;
            try {
                const b64Data = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
                buffer = Buffer.from(b64Data, 'base64');
            } catch (bufErr) {
                return res.status(400).json({ error: 'Formato base64 inválido' });
            }

            // Límite de tamaño: 15MB
            if (buffer.length > 15 * 1024 * 1024) {
                return res.status(400).json({ error: 'El archivo excede el tamaño máximo permitido (15MB)' });
            }

            const { data: uploadData, error: uploadError } = await supabaseAdmin
                .storage
                .from('cokiechat')
                .upload(filePath, buffer, {
                    contentType: mimeType || 'application/octet-stream',
                    upsert: true
                });

            if (!uploadError && uploadData) {
                const { data: publicData } = supabaseAdmin
                    .storage
                    .from('cokiechat')
                    .getPublicUrl(filePath);

                return res.json({
                    url: publicData.publicUrl,
                    filename,
                    size: buffer.length
                });
            }

            // Fallback elegante: si el bucket aún no está creado en Supabase Storage, retornar la URI base64 directamente
            const dataUri = base64.startsWith('data:') ? base64 : `data:${mimeType || 'application/octet-stream'};base64,${base64}`;
            return res.json({
                url: dataUri,
                filename,
                size: buffer.length,
                storage_mode: 'inline'
            });
        } catch (error) {
            console.error('Error en uploadAttachment:', error);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = chatController;
