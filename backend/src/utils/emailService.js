const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envía un correo de bienvenida con las credenciales usando Resend.
 * @param {string} email - Correo del usuario
 * @param {string} code - Código institucional
 * @param {string} password - Contraseña temporal
 */
const sendWelcomeEmail = async (email, code, password) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `CokieCollege <${process.env.EMAIL_FROM}>`,
            to: [email],
            subject: 'Bienvenido a CokieCollege - Tus credenciales',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h1 style="color: #6B21A8; text-align: center;">¡Bienvenido a CokieCollege!</h1>
                    <p>Hola,</p>
                    <p>Se ha creado tu cuenta en la plataforma estudiantil oficial. Aquí tienes tus credenciales de acceso:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Código Institucional:</strong> <span style="color: #6B21A8; font-family: monospace; font-size: 1.2em;">${code}</span></p>
                        <p style="margin: 5px 0;"><strong>Contraseña Temporal:</strong> <span style="color: #6B21A8; font-family: monospace; font-size: 1.2em;">${password}</span></p>
                    </div>
                    <p style="color: #ef4444; font-weight: bold;">Importante: Deberás cambiar tu contraseña al iniciar sesión por primera vez.</p>
                    <p>Si tienes algún problema para ingresar, contacta con la administración.</p>
                    <br>
                    <p>Saludos,<br><strong>El equipo de CokieCollege</strong></p>
                </div>
            `
        });

        if (error) {
            console.error('Error de Resend:', error);
            return;
        }
        console.log(`Email enviado exitosamente a ${email} ID: ${data.id}`);
    } catch (error) {
        console.error('Error enviando email con Resend:', error);
    }
};

module.exports = {
    sendWelcomeEmail
};
