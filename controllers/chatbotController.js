// controllers/chatbotController.js
import ChatBot from '../models/chatbot.js';

// HELPER: Manejo centralizado de errores
const manejarErrorValidacion = (error, res) => {
  if (error.name === 'SequelizeValidationError') {
    const mensajes = error.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: mensajes[0],
      errores: mensajes
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'El valor ya existe en la base de datos'
    });
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida en la base de datos'
    });
  }

  console.error('Error interno no controlado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

const error400 = (res, message) =>
  res.status(400).json({ success: false, message });

// CONSTANTES
const MENSAJE_MAX_LENGTH = 300;

// ENVIAR MENSAJE
export const enviarMensaje = (req, res) => {
  try {
    const { mensaje } = req.body;

    // 1. Validar que venga el mensaje
    if (!mensaje) {
      return error400(res, 'Debes enviar un mensaje');
    }

    // 2. Validar que no sea string vacío
    if (typeof mensaje !== 'string' || mensaje.trim() === '') {
      return error400(res, 'El mensaje no puede estar vacío');
    }

    // 3. Validar longitud máxima
    if (mensaje.length > MENSAJE_MAX_LENGTH) {
      return error400(res, `El mensaje no puede superar los ${MENSAJE_MAX_LENGTH} caracteres`);
    }

    // 4. Detectar intención
    const intencion = ChatBot.detectarIntencion(mensaje);

    // 5. Obtener respuesta
    const respuesta = ChatBot.obtenerRespuesta(intencion);

    // 6. Responder (no se guarda nada en BD)
    res.json({
      success: true,
      mensaje_usuario: mensaje.trim(),
      respuesta_chatbot: respuesta,
      intencion: intencion,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// OBTENER BOTONES RÁPIDOS
export const getBotones = (_req, res) => {
  try {
    const botones = [
      { id: 1, label: 'Precios', value: 'precios' },
      { id: 2, label: 'Envíos', value: 'envio' },
      { id: 3, label: 'Garantía', value: 'garantia' },
      { id: 4, label: 'Contacto', value: 'contacto' },
      { id: 5, label: 'Productos', value: 'productos' },
      { id: 6, label: 'Horario', value: 'horario' },
      { id: 7, label: 'Pagos', value: 'pago' },
      { id: 8, label: 'Devoluciones', value: 'devolucion' },
    ];

    res.json({
      success: true,
      count: botones.length,
      botones: botones
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};
