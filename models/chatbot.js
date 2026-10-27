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

  // ========== DETECTAR INTENCIÓN ==========
  detectarIntencion: (mensaje) => {
    const msg = ChatBot.normalizar(mensaje);

    if (!msg) return 'default';

    // SALUDO
    if (
      msg.includes('hola') ||
      msg.includes('buenas') ||
      msg.includes('saludo') ||
      msg.includes('que tal') ||
      msg.includes('hey') ||
      msg.includes('hi')
    ) {
      return 'saludo';
    }

    // AYUDA
    if (
      msg.includes('ayuda') ||
      msg.includes('opciones') ||
      msg.includes('que puedes hacer') ||
      msg.includes('menu') ||
      msg.includes('comandos')
    ) {
      return 'ayuda';
    }

    // DESPEDIDA
    if (
      msg.includes('gracias') ||
      msg.includes('adios') ||
      msg.includes('chao') ||
      msg.includes('bye') ||
      msg.includes('hasta luego')
    ) {
      return 'despedida';
    }

    // PRODUCTOS
    if (
      msg.includes('producto') ||
      msg.includes('gafa') ||
      msg.includes('lente') ||
      msg.includes('catalogo') ||
      msg.includes('montura') ||
      msg.includes('tienen') ||
      msg.includes('venden')
    ) {
      return 'productos';
    }

    // HORARIO
    if (
      msg.includes('horario') ||
      msg.includes('abren') ||
      msg.includes('cierran') ||
      msg.includes('atencion') ||
      msg.includes('atienden')
    ) {
      return 'horario';
    }

    // ENVÍO
    if (
      msg.includes('envio') ||
      msg.includes('domicilio') ||
      msg.includes('entrega') ||
      msg.includes('demora') ||
      msg.includes('llega')
    ) {
      return 'envio';
    }

    // FÓRMULA MÉDICA
    if (
      msg.includes('formula') ||
      msg.includes('receta') ||
      msg.includes('subir') ||
      msg.includes('adjuntar') ||
      msg.includes('medica')
    ) {
      return 'formulamedica';
    }

    // PAGO
    if (
      msg.includes('pago') ||
      msg.includes('tarjeta') ||
      msg.includes('bold') ||
      msg.includes('pagar') ||
      msg.includes('metodo') ||
      msg.includes('transferencia') ||
      msg.includes('nequi') ||
      msg.includes('daviplata')
    ) {
      return 'pago';
    }

    // DEVOLUCIÓN
    if (
      msg.includes('devolucion') ||
      msg.includes('cambio') ||
      msg.includes('reclamo') ||
      msg.includes('devolver')
    ) {
      return 'devolucion';
    }

    // GARANTÍA (va después de devolución para evitar solapamiento)
    if (
      msg.includes('garantia') ||
      msg.includes('proteccion') ||
      msg.includes('defecto') ||
      msg.includes('falla')
    ) {
      return 'garantia';
    }

    // PRECIOS
    if (
      msg.includes('precio') ||
      msg.includes('costo') ||
      msg.includes('cuanto cuesta') ||
      msg.includes('cuanto vale') ||
      msg.includes('valor')
    ) {
      return 'precios';
    }

    // CONTACTO
    if (
      msg.includes('contacto') ||
      msg.includes('contactar') ||
      msg.includes('hablar') ||
      msg.includes('comunicarse') ||
      msg.includes('soporte') ||
      msg.includes('whatsapp') ||
      msg.includes('telefono')
    ) {
      return 'contacto';
    }

    return 'default';
  },

  // ========== OBTENER RESPUESTA ==========
  obtenerRespuesta: (intencion) => {
    return ChatBot.respuestas[intencion] || ChatBot.respuestas.default;
  },
};

export default ChatBot;
