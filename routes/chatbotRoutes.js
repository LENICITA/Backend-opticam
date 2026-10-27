// routes/chatbotRoutes.js
import express from "express";
import * as chatbotController from "../controllers/chatbotController.js";

const router = express.Router();

/**
 * @swagger
 * /api/chatbot/mensaje:
 *   post:
 *     summary: Enviar mensaje al chatbot
 *     description: Recibe un mensaje del usuario, detecta su intención y devuelve una respuesta automática. No se guarda en base de datos.
 *     tags: [ChatBot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mensaje
 *             properties:
 *               mensaje:
 *                 type: string
 *                 maxLength: 300
 *                 example: "¿Qué productos ofrecen?"
 *     responses:
 *       200:
 *         description: Respuesta del chatbot
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 mensaje_usuario:
 *                   type: string
 *                   example: "¿Qué productos ofrecen?"
 *                 respuesta_chatbot:
 *                   type: string
 *                   example: "Ofrecemos gafas de sol, monturas, lentes progresivos y accesorios..."
 *                 intencion:
 *                   type: string
 *                   enum: [saludo, productos, horario, envio, formulamedica, pago, devolucion, despedida, ayuda, default, precios, contacto, garantia]
 *                   example: productos
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Mensaje no enviado, vacío o demasiado largo (máx. 300 caracteres)
 *       500:
 *         description: Error al procesar el mensaje
 */
router.post("/mensaje", chatbotController.enviarMensaje);

/**
 * @swagger
 * /api/chatbot/botones:
 *   get:
 *     summary: Obtener botones rápidos disponibles
 *     description: Devuelve la lista de botones de acceso rápido que se muestran en la interfaz del chatbot.
 *     tags: [ChatBot]
 *     responses:
 *       200:
 *         description: Lista de botones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 8
 *                 botones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       label:
 *                         type: string
 *                         example: Precios
 *                       value:
 *                         type: string
 *                         example: precios
 *       500:
 *         description: Error al obtener botones
 */
router.get("/botones", chatbotController.getBotones);

export default router;