// utils/verificarEmail.js

// Lista de dominios que definitivamente existen en la vida real
const DOMINIOS_REALES = [
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'yahoo.com',
    'live.com',
    'protonmail.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'aol.com',
    'msn.com',
    'mail.com',
    'yandex.com',
    'zoho.com',
    'tutanota.com',
    'gmx.com',
    'web.de',
    'gmx.de',
    'orange.fr',
    'free.fr',
    'laposte.net',
    'sfr.fr',
    'wanadoo.fr',
    'club-internet.fr',
    'hotmail.es',
    'hotmail.com.mx',
    'outlook.es',
    'gmail.com.mx',
    'yahoo.com.mx',
    'live.com.mx',
    'protonmail.ch',
    'pm.me',
    'outlook.com.ar',
    'hotmail.com.ar',
    'gmail.com.ar',
    'yahoo.com.ar',
    'live.com.ar'
];

// Dominios que sabemos que son falsos (de prueba/corporativos)
const DOMINIOS_FALSOS = [
    'opticam.com',
    'opticam.co',
    'opticam.com.co',
    'test.com',
    'fake.com',
    'prueba.com',
    'temp.com',
    'temporal.com',
    'ejemplo.com',
    'example.com',
    'demo.com',
    'sample.com',
    'testing.com',
    'falso.com',
    'inventado.com',
    'pruebas.com',
    'test.co',
    'fake.co'
];

// Función para verificar si un email es real por dominio
export const esEmailReal = (email) => {
    if (!email) return false;
    
    const dominio = email.split('@')[1]?.toLowerCase();
    if (!dominio) return false;
    
    return DOMINIOS_REALES.includes(dominio);
};

// Función para verificar si es un email corporativo falso
export const esEmailCorporativoFalso = (email) => {
    if (!email) return false;
    
    const dominio = email.split('@')[1]?.toLowerCase();
    if (!dominio) return false;
    
    return DOMINIOS_FALSOS.includes(dominio);
};

// Función principal para determinar si es falso
export const esEmailFalso = (email) => {
    if (!email) return true;
    
    // Si es un dominio falso conocido
    if (esEmailCorporativoFalso(email)) {
        return true;
    }
    
    // Si no es un dominio real conocido, lo consideramos falso (por seguridad)
    if (!esEmailReal(email)) {
        return true;
    }
    
    return false;
};