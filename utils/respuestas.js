// utils/respuestas.js

// Helpers para respuestas HTTP estándar
const error400 = (res, message) => res.status(400).json({ success: false, message });
const error401 = (res, message) => res.status(401).json({ success: false, message });
const error403 = (res, message) => res.status(403).json({ success: false, message });
const error404 = (res, message) => res.status(404).json({ success: false, message });

// Verifica que el usuario esté autenticado (responde 401 si no)
const verificarAutenticado = (usuario, res) => {
  if (!usuario) {
    error401(res, 'Usuario no autenticado');
    return false;
  }
  return true;
};

// Rollback + error con status personalizado
const rollbackError = async (transaction, res, status, message) => {
  await transaction.rollback();
  return res.status(status).json({ success: false, message });
};

// Error sin rollback (para métodos sin transacción)
const errorSimple = (res, status, message) => {
  return res.status(status).json({ success: false, message });
};

export {
  error400,
  error401,
  error403,
  error404,
  verificarAutenticado,
  rollbackError,
  errorSimple
};
