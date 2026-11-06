// models/chatbot.js

const ChatBot = {
  // ========== RESPUESTAS ==========
  respuestas: {
    saludo: "¡Hola! Bienvenido a ÓptiCam. ¿En qué puedo ayudarte?",
    productos: "Ofrecemos gafas de sol, monturas, lentes progresivos y accesorios. ¿Te gustaría ver nuestro catálogo?",
    horario: "Nuestro horario de atención es de Lunes a Viernes de 8am a 6pm, y Sábados de 9am a 1pm.",
    envio: "Realizamos envíos a todo el país. El costo de envío fuera de Bogotá es de $10,000 y dentro de Bogotá es de $0, y la entrega demora de 8 a 10 días hábiles.",
    formulamedica: "Para subir tu fórmula médica, ve a 'Mi Perfil' → 'Subir Fórmula'. Adjunta la imagen de tu fórmula y nuestro equipo la revisará. Te enviaremos el precio por este aplicativo.",
    pago: "Aceptamos pagos a través de Bold, nuestra pasarela de pagos segura. Puedes pagar con tarjetas débito/crédito, Nequi, Daviplata y transferencias bancarias. ¡Todos los métodos están disponibles en Bold!",
    devolucion: "Tienes 15 días hábiles para solicitar devoluciones. El producto debe estar en perfecto estado.",
    despedida: "Gracias por contactarnos. ¡Que tengas un excelente día!",
    ayuda: "*Opciones disponibles:*\n\n• Productos - Información sobre gafas y lentes\n• Horario - Horarios de atención\n• Envío - Costos y tiempos de entrega\n• Fórmula médica - Envio de formulas\n• Pago - Métodos de pago aceptados\n• Devolución - Política de cambios y garantías\n\n *¿Necesitas atención personalizada?* Escríbenos al WhatsApp: 330-120-92941",
    precios: "Nuestros precios varían según el producto:\n\n• Gafas de sol: desde $80,000\n• Monturas: desde $120,000\n• Lentes progresivos: desde $250,000\n• Lentes de contacto: desde $60,000\n\n*Los precios pueden variar según la marca y graduación.*",
    contacto: "Puedes contactarnos a través de:\n\n WhatsApp: 330-120-92941\n Correo: opticampostman@gmail.com",
    garantia: "Todos nuestros productos tienen 30 días de garantía contra defectos de fabricación",
    default: "Lo siento, no entendí tu pregunta. ¿Podrías reformularla? O escribe 'ayuda' para ver las opciones disponibles."
  },

  // ========== UTILIDADES ==========
  /**
   * Normaliza un texto: minúsculas + sin acentos
   * Ejemplo: "Información" → "informacion"
   */
  normalizar: (texto) => {
    if (!texto || typeof texto !== 'string') return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita tildes
      .trim();
  },

  // ========== TABLA DE INTENCIONES ==========
  // El orden importa: gana la primera coincidencia.
  // "garantia" va después de "devolucion" para evitar solapamiento.
  intenciones: [
    { id: 'saludo',        claves: ['hola', 'buenas', 'saludo', 'que tal', 'hey', 'hi'] },
    { id: 'ayuda',         claves: ['ayuda', 'opciones', 'que puedes hacer', 'menu', 'comandos'] },
    { id: 'despedida',     claves: ['gracias', 'adios', 'chao', 'bye', 'hasta luego'] },
    { id: 'productos',     claves: ['producto', 'gafa', 'lente', 'catalogo', 'montura', 'tienen', 'venden'] },
    { id: 'horario',       claves: ['horario', 'abren', 'cierran', 'atencion', 'atienden'] },
    { id: 'envio',         claves: ['envio', 'domicilio', 'entrega', 'demora', 'llega'] },
    { id: 'formulamedica', claves: ['formula', 'receta', 'subir', 'adjuntar', 'medica'] },
    { id: 'pago',          claves: ['pago', 'tarjeta', 'bold', 'pagar', 'metodo', 'transferencia', 'nequi', 'daviplata'] },
    { id: 'devolucion',    claves: ['devolucion', 'cambio', 'reclamo', 'devolver'] },
    { id: 'garantia',      claves: ['garantia', 'proteccion', 'defecto', 'falla'] },
    { id: 'precios',       claves: ['precio', 'costo', 'cuanto cuesta', 'cuanto vale', 'valor'] },
    { id: 'contacto',      claves: ['contacto', 'contactar', 'hablar', 'comunicarse', 'soporte', 'whatsapp', 'telefono'] },
  ],

  // ========== DETECTAR INTENCIÓN ==========
  detectarIntencion: (mensaje) => {
    const msg = ChatBot.normalizar(mensaje);
    if (!msg) return 'default';

    const match = ChatBot.intenciones.find(({ claves }) =>
      claves.some((clave) => msg.includes(clave))
    );

    return match ? match.id : 'default';
  },

  // ========== OBTENER RESPUESTA ==========
  obtenerRespuesta: (intencion) => {
    return ChatBot.respuestas[intencion] || ChatBot.respuestas.default;
  },
};

export default ChatBot;
