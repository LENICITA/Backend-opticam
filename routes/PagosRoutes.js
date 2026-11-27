import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as pagosController from '../controllers/pagosController.js';

const router = express.Router();

// ========================================
// 1. PRIMERO: RUTAS ESPECÍFICAS (SIN PARÁMETROS DINÁMICOS)
// ========================================

// ===== WEBHOOK DE BOLD (PÚBLICO, SIN AUTH) =====
// ⚠️ Esta es la URL que debes registrar en el Panel de Bold:
// https://tu-backend.vercel.app/api/pagos/webhook
/**
 * @swagger
 * /api/pagos/webhook:
 *   post:
 *     summary: Webhook de Bold (notificación servidor-servidor)
 *     description: |
 *       Endpoint llamado por Bold cuando el estado de una transacción cambia.
 *       Procesa eventos `SALE_APPROVED`, busca el pago por `external_reference`
 *       y lo confirma. Responde siempre 200 para evitar reintentos masivos.
 *     tags: [Pagos (Webhook)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: SALE_APPROVED
 *               data:
 *                 type: object
 *                 properties:
 *                   reference:
 *                     type: string
 *                     example: PEDIDO12_50_1700000000000
 *                   payment_id:
 *                     type: string
 *                     example: PAY_1234567890
 *     responses:
 *       200:
 *         description: Evento recibido (siempre responde 200, incluso si no se procesa)
 */
router.post('/webhook', pagosController.webhookBold);

// CALLBACK DE BOLD (retorno del usuario tras pagar)
router.get('/callback', pagosController.callbackBold);

// CLIENTE - Verificar saldo pendiente de un pedido
/**
 * @swagger
 * /api/pagos/pedido/{pedidoId}/saldo:
 *   get:
 *     summary: Verificar saldo pendiente de un pedido
 *     description: Devuelve el total del pedido, lo pagado, el saldo pendiente y el estado general del pago (SIN_PAGO, ABONADO_50 o PAGADO_COMPLETO).
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pedido
 *         example: 1
 *     responses:
 *       200:
 *         description: Saldo del pedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_pedido:
 *                       type: number
 *                       example: 350000
 *                     total_pagado:
 *                       type: number
 *                       example: 175000
 *                     saldo_pendiente:
 *                       type: number
 *                       example: 175000
 *                     estado_pago:
 *                       type: string
 *                       enum: [SIN_PAGO, ABONADO_50, PAGADO_COMPLETO]
 *                       example: ABONADO_50
 *                     tiene_abono_50:
 *                       type: boolean
 *                     tiene_pago_completo:
 *                       type: boolean
 *       400:
 *         description: ID inválido
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Pedido no encontrado
 */
router.get('/pedido/:pedidoId/saldo', authMiddleware, pagosController.verificarSaldoPedido);

// CLIENTE - Obtener pagos de un pedido específico
/**
 * @swagger
 * /api/pagos/pedido/{pedidoId}:
 *   get:
 *     summary: Obtener pagos de un pedido
 *     description: Devuelve todos los pagos registrados para un pedido, junto con el total pagado y si ya está pagado completamente.
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pedidoId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pedido
 *         example: 1
 *     responses:
 *       200:
 *         description: Pagos del pedido
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
 *                   example: 1
 *                 total_pagado:
 *                   type: number
 *                   example: 175000
 *                 pagado_completo:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pago'
 *       400:
 *         description: ID inválido
 *       401:
 *         description: No autenticado
 */
router.get('/pedido/:pedidoId', authMiddleware, pagosController.obtenerPagosPorPedido);

// ========================================
// 2. DESPUÉS: RUTAS CON PARÁMETROS DINÁMICOS
// ========================================

// CLIENTE - Crear un nuevo pago
/**
 * @swagger
 * /api/pagos:
 *   post:
 *     summary: Crear un pago (Cliente)
 *     description: |
 *       Genera un link de pago en Bold para un pedido.
 *
 *       Reglas:
 *       - `eleccion_pago: "50%"`: primer pago = ~50% del total; segundo pago = saldo restante.
 *       - `eleccion_pago: "100%"`: pago completo del pedido, o el saldo restante si ya hay abono.
 *       - En modo desarrollo (`BOLD_MODO=TEST`), simula el link y auto-confirma el pago a los 2s.
 *     tags: [Pagos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearPagoRequest'
 *     responses:
 *       201:
 *         description: Link de pago generado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Link de pago generado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     id_pago:
 *                       type: integer
 *                       example: 12
 *                     bold_link:
 *                       type: string
 *                       example: https://checkout.bold.co/...
 *                     bold_reference:
 *                       type: string
 *                       example: LNK_1234567890
 *                     simulado:
 *                       type: boolean
 *                       description: Solo presente en modo TEST
 *       400:
 *         description: Datos inválidos o montos no coinciden
 *       401:
 *         description: No autenticado
 *       403:
 *         description: El pedido no pertenece al usuario
 *       404:
 *         description: Pedido no encontrado
 *       500:
 *         description: Error al contactar con Bold
 */
router.post('/', authMiddleware, pagosController.crearPago);

// ========================================
// 3. ÚLTIMO: CONFIRMACIÓN/RECHAZO MANUAL (ADMIN)
// ========================================

// Confirmar pago manualmente (uso admin)
/**
 * @swagger
 * /api/pagos/{id}/confirmar:
 *   put:
 *     summary: Confirmar un pago manualmente (Admin)
 *     description: Marca el pago como Confirmado y actualiza el estado del pedido según las reglas (Abonado o Pagado). Útil como respaldo cuando el Webhook no llega.
 *     tags: [Pagos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pago
 *         example: 12
 *     responses:
 *       200:
 *         description: Pago confirmado
 *       400:
 *         description: ID inválido o el pago ya estaba confirmado
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Pago no encontrado
 */
router.put('/:id/confirmar', authMiddleware, pagosController.confirmarPago);

// Rechazar pago manualmente (uso admin)
/**
 * @swagger
 * /api/pagos/{id}/rechazar:
 *   put:
 *     summary: Rechazar un pago manualmente (Admin)
 *     description: Marca un pago como Rechazado. No se puede rechazar un pago ya confirmado.
 *     tags: [Pagos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del pago
 *         example: 12
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo:
 *                 type: string
 *                 example: Fondos insuficientes
 *     responses:
 *       200:
 *         description: Pago rechazado
 *       400:
 *         description: ID inválido o el pago ya está confirmado
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Pago no encontrado
 */
router.put('/:id/rechazar', authMiddleware, pagosController.rechazarPago);

export default router;
