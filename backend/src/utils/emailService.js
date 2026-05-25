const nodemailer = require('nodemailer');
const path = require('path');

// Configuración del transportador para Nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Para Gmail, usar una "Contraseña de Aplicación"
    },
});

/**
 * Envía un correo de bienvenida con las credenciales usando Nodemailer.
 * @param {string} full_name - Primer Nombre
 * @param {string} email - Correo del usuario
 * @param {string} code - Código institucional
 * @param {string} password - Contraseña temporal
 */
const sendWelcomeEmail = async (full_name, email, code, password) => {
    try {
        const logoPath = path.join(__dirname, '../../../src/CokieHallLogo.png');

        const mailOptions = {
            from: `"Cokie College" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Bienvenido a CokieCollege - Tus credenciales',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Bienvenido a CokieCollege</title>
                  <style>
                    body {
                      margin: 0;
                      padding: 0;
                      background-color: #f4f6f9;
                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                      -webkit-font-smoothing: antialiased;
                    }
                    .wrapper {
                      width: 100%;
                      background-color: #f4f6f9;
                      padding: 40px 0;
                    }
                    .container {
                      max-width: 540px;
                      margin: 0 auto;
                      background-color: #ffffff;
                      border-radius: 20px;
                      overflow: hidden;
                      box-shadow: 0 10px 30px rgba(11, 25, 86, 0.05);
                      border: 1px solid #eef1f6;
                    }
                    .header {
                      background-color: #0B1956;
                      padding: 40px 20px;
                      text-align: center;
                    }
                    .logo {
                      width: 130px;
                      height: auto;
                      display: block;
                      margin: 0 auto;
                    }
                    .content {
                      padding: 40px 35px;
                      color: #333333;
                    }
                    .welcome-title {
                      font-size: 24px;
                      font-weight: 800;
                      color: #0B1956;
                      margin-top: 0;
                      margin-bottom: 20px;
                      text-align: center;
                    }
                    .greeting {
                      font-size: 16px;
                      font-weight: 600;
                      color: #333333;
                      margin-bottom: 12px;
                    }
                    .intro-text {
                      font-size: 15px;
                      line-height: 1.6;
                      color: #555555;
                      margin-bottom: 25px;
                    }
                    .credentials-card {
                      background-color: #f8fafc;
                      border: 1.5px dashed #cbd5e1;
                      border-radius: 16px;
                      padding: 24px;
                      margin-bottom: 25px;
                    }
                    .credential-row {
                      margin-bottom: 15px;
                    }
                    .credential-row:last-child {
                      margin-bottom: 0;
                    }
                    .credential-label {
                      font-size: 11px;
                      font-weight: 700;
                      text-transform: uppercase;
                      letter-spacing: 1px;
                      color: #64748b;
                      margin-bottom: 4px;
                    }
                    .credential-value {
                      font-size: 18px;
                      font-weight: 700;
                      color: #0B1956;
                      font-family: 'Courier New', Courier, monospace;
                      background-color: #ffffff;
                      padding: 8px 12px;
                      border-radius: 8px;
                      border: 1px solid #e2e8f0;
                      display: inline-block;
                    }
                    .warning-box {
                      background-color: #fff5f5;
                      border-left: 4px solid #ef4444;
                      padding: 16px;
                      border-radius: 8px;
                      margin-bottom: 25px;
                    }
                    .warning-text {
                      color: #b91c1c;
                      font-size: 13.5px;
                      font-weight: 600;
                      line-height: 1.5;
                      margin: 0;
                    }
                    .footer {
                      font-size: 13px;
                      line-height: 1.5;
                      color: #64748b;
                      border-top: 1px solid #f1f5f9;
                      padding-top: 25px;
                    }
                    .footer-highlight {
                      font-weight: 700;
                      color: #0B1956;
                    }
                  </style>
                </head>
                <body>
                  <div class="wrapper">
                    <div class="container">
                      <div class="header">
                        <img src="cid:logo" alt="Cokie College Logo" class="logo">
                      </div>
                      <div class="content">
                        <h1 class="welcome-title">¡Bienvenido a Cokie Hall!</h1>
                        <p class="greeting">Hola ${full_name},</p>
                        <p class="intro-text">Se ha creado tu cuenta en la plataforma estudiantil oficial. A continuación, te compartimos tus credenciales de acceso para ingresar al portal:</p>
                        
                        <div class="credentials-card">
                          <div class="credential-row">
                            <div class="credential-label">Código Institucional</div>
                            <div class="credential-value">${code}</div>
                          </div>
                          <div class="credential-row">
                            <div class="credential-label">Contraseña</div>
                            <div class="credential-value">${password}</div>
                          </div>
                        </div>
                        
                        <div class="warning-box">
                          <p class="warning-text">Importante: Para iniciar sesión deberás usar la dirección de correo electrónico en donde has recibido este mensaje.</p>
                        </div>
                        
                        <div class="footer">
                          <p>Si experimentas algún inconveniente para ingresar, por favor comunícate con el área de administración.</p>
                          <p style="margin-bottom: 0;">Atentamente,<br><span class="footer-highlight">El equipo de CokieCollege</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
            `,
            attachments: [
                {
                    filename: 'CokieHallLogo.png',
                    path: logoPath,
                    cid: 'logo'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email enviado exitosamente a ${email} ID: ${info.messageId}`);
    } catch (error) {
        console.error('Error enviando email con Nodemailer:', error);
    }
};

module.exports = {
    sendWelcomeEmail
};
