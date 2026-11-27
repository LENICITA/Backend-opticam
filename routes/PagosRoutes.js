import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import * as pagosController from '../controllers/pagosController.js';

const router = express.Router();

// ========================================
// 1. PRIMERO: RUTAS ESPECÍFICAS (SIN PARÁMETROS DINÁMICOS)
// ========================================

// ===== WEBHOOK DE BOLD (PÚBLICO, SIN AUTH) =====
// ⚠️ Esta es la URL que debes registrar en el Panel de Bold:
// https://tu_backend_vercel.app/api/pagos/webhook

router.get('/webhook', (req, res) => {
  res.json({
    status: 'ok',
    message: '✅ Webhook endpoint activo. Bold debe enviar POST aquí.',
    method_esperado: 'POST',
    url_completa: `${req.protocol}://${req.get('host')}/api/pagos/webhook`
  });
});
router.post('/webhook', pagosController.webhookBold);

// CALLBACK DE BOLD (respaldo; ya no se usa como redirección del usuario)
router.get('/callback', pagosController.callbackBold);

// CLIENTE - Verificar saldo pendiente de un pedido
router.get('/pedido/:pedidoId/saldo', authMiddleware, pagosController.verificarSaldoPedido);

// CLIENTE - Obtener pagos de un pedido específico
router.get('/pedido/:pedidoId', authMiddleware, pagosController.obtenerPagosPorPedido);

// ========================================
// 2. DESPUÉS: RUTAS CON PARÁMETROS DINÁMICOS
// ========================================

// CLIENTE - Crear un nuevo pago
router.post('/', authMiddleware, pagosController.crearPago);

// ========================================
// 3. ÚLTIMO: CONFIRMACIÓN/RECHAZO MANUAL (ADMIN)
// ========================================

router.put('/:id/confirmar', authMiddleware, pagosController.confirmarPago);
router.put('/:id/rechazar', authMiddleware, pagosController.rechazarPago);

export default router;
