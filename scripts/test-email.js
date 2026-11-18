// backend/test-email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log(' Probando envio de correo...');
console.log('SMTP_USER:', process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error(' Error de conexion:', error);
    return;
  }
  console.log(' Conexion exitosa');

  // Enviar correo de prueba
  transporter.sendMail({
    from: `"Prueba" <${process.env.SMTP_USER}>`,
    to: process.env.CONTACT_EMAIL || 'opticavirtualbalamb@gmail.com',
    subject: 'Prueba de correo',
    text: 'Este es un correo de prueba',
  })
  .then(info => {
    console.log(' Correo enviado:', info.messageId);
  })
  .catch(err => {
    console.error(' Error al enviar:', err);
  });
});
