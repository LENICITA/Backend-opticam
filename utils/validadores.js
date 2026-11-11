// utils/validadores.js

// REGEX reutilizables
const REGEX_TELEFONO = /^3\d{9}$/;
const REGEX_CIUDAD = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const validarTelefono = (telefono) => REGEX_TELEFONO.test(telefono);
const validarCiudad = (ciudad) => REGEX_CIUDAD.test(ciudad);

const validarEmail = (email) => {
  if (typeof email !== 'string') return false;
  const limpio = email.trim();
  if (limpio !== email) return false;
  if (/\s/.test(limpio)) return false;
  if (/\.\./.test(limpio)) return false;
  if (/^\./.test(limpio)) return false;
  if (/\.$/.test(limpio)) return false;
  if (/\.@/.test(limpio)) return false;
  if (/@\./.test(limpio)) return false;
  return REGEX_EMAIL.test(limpio);
};

// Valida un documento (BIGINT)
const validarDocumento = (documento) => {
  const doc = String(documento).trim();

  if (!/^\d+$/.test(doc)) {
    return { valido: false, msg: 'El documento debe contener solo números' };
  }
  if (doc.length < 6 || doc.length > 10) {
    return { valido: false, msg: 'El documento debe tener entre 6 y 10 dígitos' };
  }
  if (/^0/.test(doc)) {
    return { valido: false, msg: 'El documento no puede empezar por cero' };
  }
  if (/^(\d)\1+$/.test(doc)) {
    return { valido: false, msg: 'El documento no puede tener todos los dígitos repetidos' };
  }
  if (esSecuencia(doc)) {
    return { valido: false, msg: 'El documento no puede ser una secuencia numérica' };
  }
  return { valido: true };
};

function esSecuencia(valor) {
  if (valor.length < 6) return false;
  let ascendente = true;
  let descendente = true;
  for (let i = 1; i < valor.length; i++) {
    const diff = valor.charCodeAt(i) - valor.charCodeAt(i - 1);
    if (diff !== 1) ascendente = false;
    if (diff !== -1) descendente = false;
  }
  return ascendente || descendente;
}

// Valida campos opcionales de usuario (teléfono, ciudad, email)
const validarCamposOpcionales = ({ telefono, ciudad, email }) => {
  if (telefono && !validarTelefono(telefono)) {
    return { valido: false, mensaje: 'El teléfono debe empezar por 3 y tener 10 dígitos' };
  }
  if (ciudad && !validarCiudad(ciudad)) {
    return { valido: false, mensaje: 'La ciudad solo puede contener letras y espacios' };
  }
  if (email && !validarEmail(email)) {
    return { valido: false, mensaje: 'El email no tiene un formato válido' };
  }
  return { valido: true };
};

export {
  REGEX_TELEFONO,
  REGEX_CIUDAD,
  REGEX_EMAIL,
  validarTelefono,
  validarCiudad,
  validarEmail,
  validarDocumento,
  esSecuencia,
  validarCamposOpcionales
};
