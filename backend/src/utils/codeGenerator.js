const crypto = require('crypto');

/**
 * Genera un código institucional basado en los apellidos y el año de ingreso.
 * Formato: [Inicial primer apellido][Inicial segundo apellido][Año de ingreso][4 dígitos aleatorios]
 * @param {string} firstName - Primer apellido
 * @param {string} secondName - Segundo apellido
 * @param {number} year - Año de ingreso
 * @returns {string} Código institucional
 */
const generateInstitutionalCode = (firstName, secondName, year) => {
    const initial1 = firstName.charAt(0).toUpperCase();
    const initial2 = secondName.charAt(0).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();
    return `${initial1}${initial2}${year}${randomDigits}`;
};

/**
 * Genera una contraseña aleatoria segura de 10 caracteres.
 * @returns {string} Contraseña aleatoria
 */
const generateRandomPassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$&';
    let password = '';
    for (let i = 0; i < 8; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
    }
    return password;
};

module.exports = {
    generateInstitutionalCode,
    generateRandomPassword
};
