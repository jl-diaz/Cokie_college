const { supabaseAdmin } = require('../config/supabase');

let ExpoClass = null;
let expoClient = null;

/**
 * Carga dinámica de expo-server-sdk para compatibilidad entre CommonJS y ES Modules en Vercel
 */
const getExpoClient = async () => {
    if (!expoClient) {
        const expoModule = await import('expo-server-sdk');
        ExpoClass = expoModule.Expo || (expoModule.default && expoModule.default.Expo) || expoModule.default;
        expoClient = new ExpoClass();
    }
    return { Expo: ExpoClass, expo: expoClient };
};

/**
 * Envía una notificación push a través de Expo y guarda en la BD.
 * @param {string} userId - El ID del usuario destinatario
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {object} data - Datos adicionales (opcional)
 */
const sendNotification = async (userId, title, body, data = {}) => {
    try {
        // 1. Guardar notificación in-app para Web
        await supabaseAdmin.from('notifications').insert([{
            user_id: userId,
            title,
            body
        }]);

        // 2. Obtener el push_token del usuario
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('push_token')
            .eq('id', userId)
            .single();

        const pushToken = profile?.push_token;
        if (!pushToken) return;

        const { Expo, expo } = await getExpoClient();

        if (!Expo.isExpoPushToken(pushToken)) {
            console.error(`Push token ${pushToken} no es válido`);
            return;
        }

        const messages = [{
            to: pushToken,
            sound: 'default',
            title,
            body,
            data,
            channelId: 'default',
            priority: 'high',
        }];

        const tickets = [];
        const chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        }
        console.log(`Notificación enviada a ${pushToken}. Tickets:`, tickets);

        // Opcional: revisar tickets inmediatamente para detectar errores
        for (let ticket of tickets) {
            if (ticket.status === 'error') {
                console.error(`Error en ticket para token ${pushToken}: ${ticket.message}`);
                if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                    console.log(`Eliminando token inválido: ${pushToken}`);
                    await supabaseAdmin.from('profiles').update({ push_token: null }).eq('push_token', pushToken);
                }
            }
        }
        return tickets;
    } catch (error) {
        console.error('Error enviando push notification:', error);
    }
};

/**
 * Función para revisar recibos (receipts) de notificaciones asíncronamente
 * Puede ser llamada por un cron job o después de enviar las notificaciones
 */
const checkPushReceipts = async (receiptIds) => {
    try {
        const { expo } = await getExpoClient();
        let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
        for (let chunk of receiptIdChunks) {
            let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
            for (let receiptId in receipts) {
                let { status, message, details } = receipts[receiptId];
                if (status === 'error') {
                    console.error(`Error en receipt ${receiptId}: ${message}`);
                    if (details && details.error === 'DeviceNotRegistered') {
                        console.log(`Un dispositivo ya no está registrado. Debe actualizarse en la DB.`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error revisando push receipts:', error);
    }
};

module.exports = {
    sendNotification,
    checkPushReceipts
};
