import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import upload from '../middlewares/upload.js';
import * as formulaController from '../controllers/formulaController.js';

const router = express.Router();

// RUTAS PARA CLIENTE (requieren token)

// Subir fórmula (cliente)
/**
 * @swagger
 * /api/formulas:
 *   post:
 *     summary: Subir fórmula médica (cliente)
 *     description: Permite al cliente subir una imagen de su fórmula médica con la condición visual y observaciones opcionales.
 *     tags: [Fórmulas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - condicion
 *               - imagen
 *             properties:
 *               condicion:
 *                 type: string
 *                 enum: [DALTONISMO, ASTIGMATISMO, MIOPIA, BAJA VISION]
 *                 example: MIOPIA
 *               observaciones:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Formula actualizada de hace 2 meses"
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: Imagen de la fórmula médica (jpg, png, etc.)
 *     responses:
 *       201:
 *         description: Fórmula subida exitosamente
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
 *                   example: Fórmula subida exitosamente. Esperando revisión del administrador
 *                 data:
 *                   $ref: '#/components/schemas/Formula'
 *       400:
 *         description: Datos inválidos o imagen faltante
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/', authMiddleware,upload.single('imagen'), formulaController.subirFormula);

//Eliminar fórmula (cliente dueño)
/**
 * @swagger
 * /api/formulas/{id}:
 *   delete:
 *     summary: Eliminar una fórmula (cliente)
 *     description: Elimina una fórmula propia. Solo si está en estado "Pendiente". También elimina la imagen de Cloudinary.
 *     tags: [Fórmulas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la fórmula
 *         example: 1
 *     responses:
 *       200:
 *         description: Fórmula eliminada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeExito'
 *       400:
 *         description: La fórmula no está en estado Pendiente
 *       401:
 *         description: No autenticado
 *       403:
 *         description: La fórmula no pertenece al usuario
 *       404:
 *         description: Fórmula no encontrada
 */
router.delete('/:id', authMiddleware, formulaController.eliminarFormula);

// Ver mis fórmulas (cliente)
/**
 * @swagger
 * /api/formulas/mis-formulas:
 *   get:
 *     summary: Ver mis fórmulas (cliente)
 *     description: Devuelve todas las fórmulas del usuario autenticado.
 *     tags: [Fórmulas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de fórmulas del usuario
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
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Formula'
 *       401:
 *         description: No autenticado
 */
router.get('/mis-formulas', authMiddleware, formulaController.obtenerMisFormulas);

// Ver fórmula por ID (cliente dueño)
/**
 * @swagger
 * /api/formulas/{id}:
 *   get:
 *     summary: Ver fórmula por ID
 *     description: Devuelve los datos de una fórmula específica. Un cliente solo puede ver las suyas; un admin puede ver cualquiera.
 *     tags: [Fórmulas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la fórmula
 *         example: 1
 *     responses:
 *       200:
 *         description: Datos de la fórmula
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Formula'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para ver esta fórmula
 *       404:
 *         description: Fórmula no encontrada
 */
router.get('/:id', authMiddleware, formulaController.obtenerFormulaPorId);

// Verificar si fórmula está aprobada (cliente dueño)
/**
 * @swagger
 * /api/formulas/{id}/verificar:
 *   get:
 *     summary: Verificar si una fórmula está aprobada
 *     description: Devuelve si la fórmula propia está aprobada, su estado y su costo.
 *     tags: [Fórmulas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la fórmula
 *         example: 1
 *     responses:
 *       200:
 *         description: Estado de la fórmula
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
 *                     id_formula:
 *                       type: integer
 *                       example: 1
 *                     aprobada:
 *                       type: boolean
 *                       example: true
 *                     estado:
 *                       type: string
 *                       enum: [Pendiente, Aprobado, Rechazado]
 *                       example: Aprobado
 *                     costo:
 *                       type: number
 *                       example: 150000
 *                     imagen_url:
 *                       type: string
 *                       example: https://res.cloudinary.com/...
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para verificar esta fórmula
 *       404:
 *         description: Fórmula no encontrada
 */
router.get('/:id/verificar', authMiddleware, formulaController.verificarFormulaAprobada);

// RUTAS PARA ADMIN (requieren token + admin)

// Ver todas las fórmulas (admin)
/**
 * @swagger
 * /api/formulas/admin/todas:
 *   get:
 *     summary: Ver todas las fórmulas (admin)
 *     description: Devuelve todas las fórmulas con datos del cliente (nombre, email, teléfono).
 *     tags: [Fórmulas (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista completa de fórmulas
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
 *                     $ref: '#/components/schemas/FormulaConCliente'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (se requiere rol ADMIN)
 */
router.get('/admin/todas', authMiddleware, adminMiddleware, formulaController.obtenerTodasLasFormulas);

// Ver fórmulas pendientes (admin)
/**
 * @swagger
 * /api/formulas/admin/pendientes:
 *   get:
 *     summary: Ver fórmulas pendientes (admin)
 *     description: Devuelve solo las fórmulas en estado "Pendiente" con datos del cliente.
 *     tags: [Fórmulas (Admin)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de fórmulas pendientes
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
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FormulaConCliente'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/admin/pendientes', authMiddleware, adminMiddleware, formulaController.obtenerFormulasPendientes);

// Asignar precio a fórmula (admin)
/**
 * @swagger
 * /api/formulas/{id}/precio:
 *   put:
 *     summary: Asignar precio a una fórmula (admin)
 *     description: Asigna un costo y opcionalmente cambia el estado de la fórmula. Por defecto queda "Aprobado".
 *     tags: [Fórmulas (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la fórmula
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - costo
 *             properties:
 *               costo:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 150000
 *               estado:
 *                 type: string
 *                 enum: [Pendiente, Aprobado, Rechazado]
 *                 example: Aprobado
 *     responses:
 *       200:
 *         description: Precio asignado exitosamente
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
 *                   example: "Precio asignado exitosamente. Estado: Aprobado"
 *                 data:
 *                   $ref: '#/components/schemas/Formula'
 *       400:
 *         description: Costo inválido, estado inválido o fórmula rechazada
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Fórmula no encontrada
 */
router.put('/:id/precio', authMiddleware, adminMiddleware, formulaController.asignarPrecioFormula);

// Cambiar estado de fórmula (admin)
/**
 * @swagger
 * /api/formulas/{id}/estado:
 *   put:
 *     summary: Cambiar estado de una fórmula (admin)
 *     description: Actualiza el estado de la fórmula a Pendiente, Aprobado o Rechazado.
 *     tags: [Fórmulas (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la fórmula
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
 *                 enum: [Pendiente, Aprobado, Rechazado]
 *                 example: Rechazado
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
 *                   example: "Estado actualizado a: Rechazado"
 *                 data:
 *                   $ref: '#/components/schemas/Formula'
 *       400:
 *         description: Estado inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Fórmula no encontrada
 */
router.put('/:id/estado', authMiddleware, adminMiddleware, formulaController.cambiarEstadoFormula);

export default router;