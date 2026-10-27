// routes/pedidoRoutes.js
import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import * as pedidoController from '../controllers/pedidoController.js';

const router = express.Router();

// ============================================
// RUTAS PARA ADMIN (van PRIMERO para evitar conflictos con /:id)
// ============================================

/**
 * @swagger
 * /api/pedidos/admin/todos:
 *   get:
 *     summary: Obtener todos los pedidos (Admin)
 *     description: Devuelve todos los pedidos activos (no Pendientes ni Cancelados) con datos del cliente, fórmula y repartidor asignado.
 *     tags: [Pedidos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos
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
 *                   example: 20
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PedidoConCliente'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere admin)
 */
router.get('/admin/todos', authMiddleware, adminMiddleware, pedidoController.obtenerTodosLosPedidos);

/**
 * @swagger
 * /api/pedidos/admin/estado/{estado}:
 *   get:
 *     summary: Obtener pedidos por estado (Admin)
 *     description: Devuelve pedidos filtrados por estado activo.
 *     tags: [Pedidos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: estado
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Abonado, Listo, Pagado, En Proceso, Enviado, Entregado]
 *         example: Abonado
 *     responses:
 *       200:
 *         description: Pedidos con ese estado
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pedido'
 *       400:
 *         description: Estado inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/admin/estado/:estado', authMiddleware, adminMiddleware, pedidoController.obtenerPedidosPorEstado);

/**
 * @swagger
 * /api/pedidos/admin/estadisticas:
 *   get:
 *     summary: Obtener estadísticas de pedidos (Admin)
 *     description: Devuelve conteos por estado, ingresos totales y promedio de venta.
 *     tags: [Pedidos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de pedidos
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
 *                     total_pedidos:
 *                       type: integer
 *                       example: 120
 *                     abonados:
 *                       type: integer
 *                     listos:
 *                       type: integer
 *                     pagados:
 *                       type: integer
 *                     en_proceso:
 *                       type: integer
 *                     enviados:
 *                       type: integer
 *                     entregados:
 *                       type: integer
 *                     ingresos_totales:
 *                       type: number
 *                       example: 15000000
 *                     promedio_venta:
 *                       type: number
 *                       example: 250000
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/admin/estadisticas', authMiddleware, adminMiddleware, pedidoController.obtenerEstadisticasPedidos);

// ============================================
// RUTAS PARA CLIENTE (requieren token)
// ============================================

/**
 * @swagger
 * /api/pedidos:
 *   post:
 *     summary: Crear un pedido (Cliente)
 *     description: Crea un pedido con uno o más productos. Opcionalmente incluye una fórmula médica aprobada. Calcula subtotal, costo de fórmula, costo de envío y total. La fecha estimada se calcula automáticamente (8-10 días hábiles).
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CrearPedidoRequest'
 *     responses:
 *       201:
 *         description: Pedido creado exitosamente
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
 *                   example: Pedido creado exitosamente
 *                 data:
 *                   $ref: '#/components/schemas/PedidoCreado'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: La fórmula no pertenece al usuario
 *       404:
 *         description: Producto o fórmula no encontrados
 */
router.post('/', authMiddleware, pedidoController.crearPedido);

/**
 * @swagger
 * /api/pedidos/mis-pedidos:
 *   get:
 *     summary: Ver mis pedidos (Cliente)
 *     description: Devuelve todos los pedidos del usuario autenticado con sus productos.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos del cliente
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
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PedidoConProductos'
 *       401:
 *         description: No autenticado
 */
router.get('/mis-pedidos', authMiddleware, pedidoController.obtenerMisPedidos);

/**
 * @swagger
 * /api/pedidos/{id}:
 *   get:
 *     summary: Ver detalle de un pedido
 *     description: Devuelve el detalle completo de un pedido (cliente dueño o admin). Incluye productos, cliente y fórmula.
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Detalle del pedido
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
 *                     pedido:
 *                       $ref: '#/components/schemas/PedidoDetalle'
 *                     productos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ProductoEnPedido'
 *       400:
 *         description: ID inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para ver este pedido
 *       404:
 *         description: Pedido no encontrado
 */
router.get('/:id', authMiddleware, pedidoController.obtenerPedidoPorId);

/**
 * @swagger
 * /api/pedidos/{id}/cancelar:
 *   put:
 *     summary: Cancelar un pedido (Cliente)
 *     description: Cancela un pedido. Solo se puede cancelar si está en estado "Pendiente".
 *     tags: [Pedidos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Pedido cancelado exitosamente
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
 *                   example: Pedido cancelado exitosamente
 *                 data:
 *                   $ref: '#/components/schemas/Pedido'
 *       400:
 *         description: El pedido no está en estado Pendiente o la transición no es válida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para cancelar este pedido
 *       404:
 *         description: Pedido no encontrado
 */
router.put('/:id/cancelar', authMiddleware, pedidoController.cancelarPedido);

// ============================================
// RUTAS PARA ADMIN sobre un pedido específico
// ============================================

/**
 * @swagger
 * /api/pedidos/{id}/listo:
 *   put:
 *     summary: Marcar pedido como LISTO (Admin)
 *     description: Marca un pedido como "Listo" (gafas listas para que el cliente pague el 50% restante). Requiere que el pedido tenga un abono del 50% confirmado y NO esté pagado al 100%.
 *     tags: [Pedidos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Pedido marcado como LISTO
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
 *                   example: Pedido marcado como LISTO. El cliente puede pagar el 50% restante.
 *                 data:
 *                   $ref: '#/components/schemas/Pedido'
 *       400:
 *         description: El pedido no está en estado Abonado, no tiene abono del 50% o ya está pagado al 100%
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Pedido no encontrado
 */
router.put('/:id/listo', authMiddleware, adminMiddleware, pedidoController.marcarPedidoComoListo);

/**
 * @swagger
 * /api/pedidos/{id}/estado:
 *   put:
 *     summary: Actualizar estado del pedido (Admin)
 *     description: |
 *       Cambia el estado de un pedido respetando la máquina de estados:
 *
 *       - Pendiente → Abonado, Cancelado
 *       - Abonado → Listo, Cancelado
 *       - Listo → Pagado
 *       - Pagado → En Proceso
 *       - En Proceso → Enviado
 *       - Enviado → Entregado
 *     tags: [Pedidos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [Abonado, Listo, Pagado, En Proceso, Enviado, Entregado]
 *                 example: Pagado
 *     responses:
 *       200:
 *         description: Estado actualizado
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
 *                   example: "Estado actualizado a: Pagado"
 *                 data:
 *                   $ref: '#/components/schemas/Pedido'
 *       400:
 *         description: Estado inválido o transición no permitida
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Pedido no encontrado
 */
router.put('/:id/estado', authMiddleware, adminMiddleware, pedidoController.actualizarEstadoPedido);

/**
 * @swagger
 * /api/pedidos/{id}/fecha-estimada:
 *   put:
 *     summary: Actualizar fecha estimada de entrega (Admin)
 *     description: Actualiza la fecha estimada. Solo permitido en estados Abonado, Listo, Pagado o En Proceso. La fecha debe ser hoy o futura (formato YYYY-MM-DD).
 *     tags: [Pedidos (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fecha_estimada
 *             properties:
 *               fecha_estimada:
 *                 type: string
 *                 format: date
 *                 example: "2026-09-25"
 *     responses:
 *       200:
 *         description: Fecha actualizada
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
 *                   example: Fecha estimada de entrega actualizada
 *                 data:
 *                   $ref: '#/components/schemas/Pedido'
 *       400:
 *         description: Formato de fecha inválido, fecha pasada, o estado no permite editar
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Pedido no encontrado
 */
router.put('/:id/fecha-estimada', authMiddleware, adminMiddleware, pedidoController.actualizarFechaEstimada);

export default router;