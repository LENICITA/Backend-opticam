// utils/manejarErrores.js

/**
 * Helper centralizado para manejar errores de Sequelize y errores internos.
 * Se importa en todos los controllers para evitar duplicación.
 */
const manejarErrorValidacion = (error, res) => {
  // 1. Validación de Sequelize
  if (error.name === 'SequelizeValidationError') {
    const mensajes = error.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: mensajes[0],
      errores: mensajes
    });
  }

  // 2. Campo único duplicado (email, documento, placa, etc.)
  if (error.name === 'SequelizeUniqueConstraintError') {
    const campo = error.errors[0]?.path || 'campo';
    const mensajes = {
      email: 'El email ya está registrado',
      documento: 'El documento ya está registrado',
      placa: 'La placa ya está registrada'
    };
    return res.status(400).json({
      success: false,
      message: mensajes[campo] || `El ${campo} ya está registrado`
    });
  }

  // 3. FK
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida en la base de datos'
    });
  }

  // 4. Error de BD
  if (error.name === 'SequelizeDatabaseError') {
    console.error('Error de base de datos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud en la base de datos'
    });
  }

  // 5. Errores de transición lanzados desde el modelo (distribucionController)
  if (error.message && (
    error.message.includes('No se puede') ||
    error.message.includes('Solo se pueden')
  )) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // 6. Error interno no controlado
  console.error('Error interno no controlado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

export default manejarErrorValidacion;
