// controllers/contactoController.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// CONFIGURACIÓN SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error(' Error al conectar con SMTP:', error);
  } else {
    console.log(' Servidor SMTP listo para enviar correos');
  }
});

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

  console.error('Error interno no controlado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// VALIDADORES REUTILIZABLES
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_TELEFONO = /^[0-9+\-\s()]{7,20}$/;

const LONGITUDES = {
  NOMBRE_MIN: 2,
  NOMBRE_MAX: 100,
  EMAIL_MAX: 100,
  TELEFONO_MAX: 20,
  MENSAJE_MIN: 10,
  MENSAJE_MAX: 1000
};

const validarEmail = (email) => REGEX_EMAIL.test(String(email).trim());
const validarTelefono = (telefono) => REGEX_TELEFONO.test(String(telefono).trim());

// HELPER: Escapar HTML (evita inyecciones en el correo)
const escaparHTML = (texto) => {
  if (!texto) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ENVIAR MENSAJE DE CONTACTO
export const enviarMensaje = async (req, res) => {
  try {
    const { nombre, email, telefono, mensaje } = req.body;

    console.log(' Mensaje de contacto recibido');

    // 1. Campos requeridos
    if (!nombre || !email || !mensaje) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email y mensaje son requeridos'
      });
    }

    // 2. Validar que sean strings
    if (typeof nombre !== 'string' || typeof email !== 'string' || typeof mensaje !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Los campos deben ser texto'
      });
    }

    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim().toLowerCase();
    const telefonoLimpio = telefono ? String(telefono).trim() : '';
    const mensajeLimpio = mensaje.trim();

    // 3. Validar longitud del nombre
    if (nombreLimpio.length < LONGITUDES.NOMBRE_MIN || nombreLimpio.length > LONGITUDES.NOMBRE_MAX) {
      return res.status(400).json({
        success: false,
        message: `El nombre debe tener entre ${LONGITUDES.NOMBRE_MIN} y ${LONGITUDES.NOMBRE_MAX} caracteres`
      });
    }

    // 4. Validar email
    if (emailLimpio.length > LONGITUDES.EMAIL_MAX) {
      return res.status(400).json({
        success: false,
        message: `El email no puede superar los ${LONGITUDES.EMAIL_MAX} caracteres`
      });
    }

    if (!validarEmail(emailLimpio)) {
      return res.status(400).json({
        success: false,
        message: 'El email no tiene un formato válido'
      });
    }

    // 5. Validar teléfono (solo si viene)
    if (telefonoLimpio && !validarTelefono(telefonoLimpio)) {
      return res.status(400).json({
        success: false,
        message: 'El teléfono debe tener entre 7 y 20 caracteres (solo números, +, -, espacios y paréntesis)'
      });
    }

    // 6. Validar longitud del mensaje
    if (mensajeLimpio.length < LONGITUDES.MENSAJE_MIN || mensajeLimpio.length > LONGITUDES.MENSAJE_MAX) {
      return res.status(400).json({
        success: false,
        message: `El mensaje debe tener entre ${LONGITUDES.MENSAJE_MIN} y ${LONGITUDES.MENSAJE_MAX} caracteres`
      });
    }

    console.log(' Preparando envío de correo...');

    // 7. Sanitizar y preparar HTML
    const mailOptions = {
      from: process.env.SMTP_FROM || `"Formulario Web" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_EMAIL || 'opticavirtualbalamb@gmail.com',
      subject: ' Nuevo mensaje de contacto - Óptica Balamb',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
          <h2 style="color: #B90F0F;"> Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${escaparHTML(nombreLimpio)}</p>
          <p><strong>Email:</strong> ${escaparHTML(emailLimpio)}</p>
          <p><strong>Teléfono:</strong> ${escaparHTML(telefonoLimpio) || 'No proporcionado'}</p>
          <p><strong>Mensaje:</strong></p>
          <p style="background-color: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd; white-space: pre-wrap;">${escaparHTML(mensajeLimpio)}</p>
          <p style="color: #666; font-size: 12px;">Enviado desde el formulario de contacto</p>
        </div>
      `,
    };

    console.log(' Enviando correo a:', mailOptions.to);

    const info = await transporter.sendMail(mailOptions);
    console.log(' Correo enviado. ID:', info.messageId);

    res.json({
      success: true,
      message: 'Mensaje enviado correctamente'
    });

  } catch (error) {
    console.error(' Error al enviar correo:', error);
    return manejarErrorValidacion(error, res);
  }
};