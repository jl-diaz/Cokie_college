const { Expo } = require('expo-server-sdk');
const expo = new Expo();

/**
 * Envía una notificación push a través de Expo.
 * @param {string} pushToken - El token de Expo del destinatario
 * @param {string} title - Título de la notificación
 * @param {string} body - Cuerpo de la notificación
 * @param {object} data - Datos adicionales (opcional)
 */
const sendPushNotification = async (pushToken, title, body, data = {}) => {
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
    }];

    try {
        const chunks = expo.chunkPushNotifications(messages);
        for (let chunk of chunks) {
            await expo.sendPushNotificationsAsync(chunk);
        }
        console.log(`Notificación enviada a ${pushToken}`);
    } catch (error) {
        console.error('Error enviando push notification:', error);
    }
};

module.exports = {
    sendPushNotification
};
