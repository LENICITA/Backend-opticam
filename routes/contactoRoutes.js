import express from 'express';
import { enviarMensaje } from '../controllers/contactoController.js';

const router = express.Router();

/**
 * @swagger
 * /api/contacto:
 *   post:
 *     summary: Enviar mensaje de contacto
 *     description: Recibe los datos del formulario de contacto y los envía por correo al administrador. No se guarda en base de datos.
 *     tags: [Contacto]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - mensaje
 *             properties:
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 maxLength: 100
 *                 example: juan@correo.com
 *               telefono:
 *                 type: string
 *                 maxLength: 20
 *                 description: Opcional. Solo números, +, -, espacios y paréntesis
 *                 example: "3001234567"
 *               mensaje:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 1000
 *                 example: "Hola, quisiera saber más sobre sus lentes progresivos."
 *     responses:
 *       200:
 *         description: Mensaje enviado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeExito'
 *       400:
 *         description: Datos inválidos (campos faltantes, longitudes incorrectas, email o teléfono inválidos)
 *       500:
 *         description: Error al enviar el correo
 */
router.post('/', enviarMensaje);

export default router;