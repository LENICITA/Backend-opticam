// routes/distribucionRoutes.js
import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import * as distribucionController from '../controllers/distribucionController.js';

const router = express.Router();

// ============================================
// RUTAS PARA ADMIN (requieren token + admin)
// ============================================

// Asignar pedido a repartidor
/**
 * @swagger
 * /api/distribucion:
 *   post:
 *     summary: Asignar pedido a repartidor o distribuidora externa (Admin)
 *     description: |
 *       Asigna un pedido en estado "Pagado" a una distribución.
 *
 *       Reglas:
 *       - Si la ciudad del pedido es **Bogotá**, se asigna al repartidor indicado (`id_usuario`).
 *       - Si es **otra ciudad**, se asigna automáticamente a la distribuidora externa (admin).
 *       - Un pedido no puede tener dos distribuciones activas.
 *       - Al crear la distribución, el pedido pasa a estado **En Proceso**.
 *     tags: [Distribuciones (Admin)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_pedido
 *               - id_usuario
 *             properties:
 *               id_pedido:
 *                 type: integer
 *                 example: 10
 *               id_usuario:
 *                 type: integer
 *                 description: ID del repartidor (solo se usa si la ciudad es Bogotá)
 *                 example: 5
 *               observaciones:
 *                 type: string
 *                 maxLength: 5000
 *                 example: "Entregar en la tarde"
 *     responses:
 *       201:
 *         description: Distribución creada
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
 *                   example: Pedido asignado exitosamente al repartidor Juan Pérez
 *                 data:
 *                   type: object
 *                   properties:
 *                     distribucion:
 *                       $ref: '#/components/schemas/Distribucion'
 *                     tipo_asignacion:
 *                       type: string
 *                       enum: [REPARTIDOR, DISTRIBUIDORA_EXTERNA]
 *                     ciudad_cliente:
 *                       type: string
 *                       example: bogotá
 *                     es_bogota:
 *                       type: boolean
 *                     usuario_asignado:
 *                       type: object
 *                       properties:
 *                         id: { type: integer }
 *                         nombre_completo: { type: string }
 *                         email: { type: string, format: email }
 *                         telefono: { type: string }
 *                     pedido:
 *                       type: object
 *                       properties:
 *                         id_pedido: { type: integer }
 *                         direccion_entrega: { type: string }
 *                         ciudad_envio: { type: string }
 *                         total: { type: number }
 *                         fecha_estimada: { type: string, format: date }
 *       400:
 *         description: Datos inválidos o el pedido no está en estado Pagado
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere admin)
 *       404:
 *         description: Pedido, repartidor o admin no encontrados
 */
router.post('/', authMiddleware, adminMiddleware, distribucionController.asignarPedido);

// Obtener todas las distribuciones
/**
 * @swagger
 * /api/distribucion/admin/todas:
 *   get:
 *     summary: Obtener todas las distribuciones (Admin)
 *     description: Devuelve todas las distribuciones registradas con datos del pedido, cliente y repartidor.
 *     tags: [Distribuciones (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de distribuciones
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
 *                   example: 25
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DistribucionConDetalles'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/admin/todas', authMiddleware, adminMiddleware, distribucionController.obtenerTodas);

// Obtener distribuciones externas (fuera de Bogotá)
/**
 * @swagger
 * /api/distribucion/admin/externas:
 *   get:
 *     summary: Obtener distribuciones externas (Admin)
 *     description: Devuelve solo las distribuciones cuya ciudad de envío NO es Bogotá.
 *     tags: [Distribuciones (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribuciones externas
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
 *                     type: object
 *                     properties:
 *                       id_distribucion: { type: integer }
 *                       estado: { type: string, enum: [PENDIENTE, EN_ENTREGA, ENTREGADO, CANCELADO] }
 *                       fecha_asignacion: { type: string, format: date-time }
 *                       fecha_entrega: { type: string, format: date-time, nullable: true }
 *                       observaciones: { type: string, nullable: true }
 *                       admin_asignado:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           nombre_completo: { type: string }
 *                           email: { type: string, format: email }
 *                           telefono: { type: string }
 *                           vehiculo: { type: string, example: 'N/A' }
 *                       cliente:
 *                         type: object
 *                         properties:
 *                           id: { type: integer }
 *                           nombre_completo: { type: string }
 *                           email: { type: string, format: email }
 *                           telefono: { type: string }
 *                           ciudad: { type: string }
 *                       pedido:
 *                         type: object
 *                         properties:
 *                           id_pedido: { type: integer }
 *                           direccion_entrega: { type: string }
 *                           total: { type: number }
 *                           fecha_estimada: { type: string, format: date }
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: No se encontró un admin
 */
router.get('/admin/externas', authMiddleware, adminMiddleware, distribucionController.obtenerDistribucionesExternas);

// Cancelar entrega
/**
 * @swagger
 * /api/distribucion/admin/{id}/cancelar:
 *   put:
 *     summary: Cancelar una entrega (Admin)
 *     description: Cancela una distribución. Solo se puede cancelar si está en estado PENDIENTE. El pedido vuelve a estado "Pagado".
 *     tags: [Distribuciones (Admin)]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               observacion:
 *                 type: string
 *                 maxLength: 5000
 *                 example: "Cliente canceló la compra"
 *     responses:
 *       200:
 *         description: Distribución cancelada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Entrega cancelada exitosamente. El pedido vuelve a estado PAGADO.' }
 *                 data:
 *                   $ref: '#/components/schemas/Distribucion'
 *       400:
 *         description: No se puede cancelar en el estado actual
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Distribución no encontrada
 */
router.put('/admin/:id/cancelar', authMiddleware, adminMiddleware, distribucionController.cancelarEntrega);

// ============================================
// RUTAS PARA REPARTIDOR (requieren token)
// ============================================

// Obtener distribuciones asignadas al repartidor
/**
 * @swagger
 * /api/distribucion/mis-distribuciones:
 *   get:
 *     summary: Ver mis distribuciones (Repartidor)
 *     description: Devuelve TODAS las distribuciones asignadas al repartidor autenticado, en cualquier estado, con datos del cliente y su vehículo.
 *     tags: [Distribuciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de distribuciones del repartidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 8 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DistribucionConDetalles'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Solo los repartidores pueden ver sus distribuciones
 */
router.get('/mis-distribuciones', authMiddleware, distribucionController.obtenerMisDistribuciones);

// Ver pedidos pendientes
/**
 * @swagger
 * /api/distribucion/pendientes:
 *   get:
 *     summary: Ver pedidos pendientes
 *     description: |
 *       Devuelve las distribuciones en estado PENDIENTE.
 *
 *       - Si el usuario es **repartidor**, devuelve sus pedidos pendientes.
 *       - Si es **admin**, devuelve solo las distribuciones externas (fuera de Bogotá).
 *     tags: [Distribuciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos pendientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 3 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DistribucionConCliente'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: No se encontró un admin (solo en caso admin)
 */
router.get('/pendientes', authMiddleware, distribucionController.obtenerPendientes);

// Ver pedidos en entrega
/**
 * @swagger
 * /api/distribucion/en-entrega:
 *   get:
 *     summary: Ver pedidos en entrega
 *     description: Devuelve las distribuciones en estado EN_ENTREGA del repartidor autenticado (o externas si es admin).
 *     tags: [Distribuciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pedidos en entrega
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 2 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DistribucionConCliente'
 *       401:
 *         description: No autenticado
 */
router.get('/en-entrega', authMiddleware, distribucionController.obtenerEnEntrega);

// Ver historial de entregas
/**
 * @swagger
 * /api/distribucion/historial:
 *   get:
 *     summary: Ver historial de entregas
 *     description: Devuelve las distribuciones en estado ENTREGADO del repartidor autenticado (o externas si es admin).
 *     tags: [Distribuciones]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial de entregas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 15 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DistribucionConCliente'
 *       401:
 *         description: No autenticado
 */
router.get('/historial', authMiddleware, distribucionController.obtenerHistorial);

// Ver detalle de una distribución (con dirección)
/**
 * @swagger
 * /api/distribucion/{id}:
 *   get:
 *     summary: Ver detalle de una distribución
 *     description: Devuelve el detalle completo de una distribución (incluye dirección, cliente y vehículo del repartidor). Un repartidor solo puede ver las suyas; un admin puede ver cualquiera.
 *     tags: [Distribuciones]
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
 *         description: Detalle de la distribución
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/DistribucionDetalle'
 *       400:
 *         description: ID inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para ver esta distribución
 *       404:
 *         description: Distribución no encontrada
 */
router.get('/:id', authMiddleware, distribucionController.obtenerDistribucionPorId);  

// Iniciar entrega
/**
 * @swagger
 * /api/distribucion/{id}/iniciar:
 *   patch:
 *     summary: Iniciar entrega (Repartidor)
 *     description: |
 *       Pasa la distribución de PENDIENTE a EN_ENTREGA y actualiza el pedido a estado "Enviado".
 *
 *       Reglas de permisos:
 *       - Repartidor: solo sus propias distribuciones.
 *       - Admin: solo distribuciones externas (fuera de Bogotá).
 *     tags: [Distribuciones]
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
 *         description: Entrega iniciada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Entrega iniciada exitosamente. Pedido enviado.' }
 *                 data:
 *                   $ref: '#/components/schemas/Distribucion'
 *       400:
 *         description: No se puede iniciar en el estado actual
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para iniciar esta entrega
 *       404:
 *         description: Distribución o pedido no encontrados
 */
router.patch('/:id/iniciar', authMiddleware, distribucionController.iniciarEntrega);

// Marcar como entregado
/**
 * @swagger
 * /api/distribucion/{id}/entregar:
 *   patch:
 *     summary: Marcar como entregado (Repartidor)
 *     description: |
 *       Pasa la distribución de EN_ENTREGA a ENTREGADO y actualiza el pedido a estado "Entregado". Permite agregar una observación final.
 *
 *       Reglas de permisos:
 *       - Repartidor: solo sus propias distribuciones.
 *       - Admin: solo distribuciones externas.
 *     tags: [Distribuciones]
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
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               observacion:
 *                 type: string
 *                 maxLength: 5000
 *                 example: "Entregado al portero"
 *     responses:
 *       200:
 *         description: Pedido marcado como entregado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Pedido marcado como entregado exitosamente' }
 *                 data:
 *                   $ref: '#/components/schemas/Distribucion'
 *       400:
 *         description: No se puede marcar como entregado en el estado actual
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para marcar esta entrega
 *       404:
 *         description: Distribución o pedido no encontrados
 */
router.patch('/:id/entregar', authMiddleware, distribucionController.marcarEntregado);

export default router;