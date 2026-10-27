import express from 'express';
import {
    registrarCliente,
    registrarRepartidor,
    listarRepartidores,
    obtenerRepartidor,
    actualizarRepartidor,
    eliminarRepartidor,
    cambiarEstadoRepartidor,
    buscarRepartidores,
    obtenerPerfil,
    actualizarPerfil,
    contarClientes
} from '../controllers/userController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// RUTAS PÚBLICAS
// Registro Cliente
/**
 * @swagger
 * /api/usuarios/registro:
 *   post:
 *     summary: Registrar un nuevo cliente
 *     description: Crea un usuario con rol CLIENTE por defecto y devuelve un token JWT.
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroClienteRequest'
 *     responses:
 *       201:
 *         description: Cliente registrado exitosamente
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
 *                   example: Cliente registrado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       $ref: '#/components/schemas/UsuarioBasico'
 *                     token:
 *                       type: string
 *       400:
 *         description: Datos inválidos o email/documento ya registrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/registro', registrarCliente);
/**
 * @swagger
 * /api/usuarios/clientes/count:
 *   get:
 *     summary: Contar clientes registrados
 *     description: Devuelve el total de usuarios con rol CLIENTE. Solo accesible por administradores.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total de clientes
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
 *                     total:
 *                       type: integer
 *                       example: 42
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (se requiere rol ADMIN)
 */
router.get('/clientes/count', authMiddleware, adminMiddleware, contarClientes);

// RUTAS DE PERFIL (requieren autenticación)
/**
 * @swagger
 * /api/usuarios/perfil:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     description: Devuelve los datos del usuario logueado, incluyendo roles y vehículo si es repartidor.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/UsuarioPerfil'
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/perfil', authMiddleware, obtenerPerfil);
/**
 * @swagger
 * /api/usuarios/perfil:
 *   put:
 *     summary: Actualizar perfil del usuario autenticado
 *     description: Permite al usuario actualizar sus datos. Los repartidores no pueden editar su perfil.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarPerfilRequest'
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
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
 *                   example: Perfil actualizado correctamente
 *                 data:
 *                   $ref: '#/components/schemas/UsuarioPerfil'
 *       400:
 *         description: Datos inválidos o email/documento ya registrado por otro usuario
 *       401:
 *         description: No autenticado
 *       403:
 *         description: Los repartidores no pueden editar su perfil
 *       404:
 *         description: Usuario no encontrado
 */
router.put('/perfil', authMiddleware, actualizarPerfil);

// PANEL DE CONTROL DE ADMIN PARA REPARTIDORES
// CREAR REPARTIDOR
/**
 * @swagger
 * /api/usuarios/repartidores:
 *   post:
 *     summary: Registrar un nuevo repartidor
 *     description: Crea un usuario con rol REPARTIDOR y su vehículo asociado. Solo admin.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroRepartidorRequest'
 *     responses:
 *       201:
 *         description: Repartidor registrado exitosamente
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
 *                   example: Repartidor registrado exitosamente
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       $ref: '#/components/schemas/UsuarioBasico'
 *                     vehiculo:
 *                       $ref: '#/components/schemas/Vehiculo'
 *       400:
 *         description: Datos inválidos o email/documento/placa ya registrados
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (se requiere rol ADMIN)
 *       500:
 *         description: Error interno (ej. rol REPARTIDOR no existe)
 */
router.post('/repartidores', authMiddleware, adminMiddleware, registrarRepartidor);

// LISTAR TODOS LOS REPARTIDORES
/**
 * @swagger
 * /api/usuarios/repartidores:
 *   get:
 *     summary: Listar todos los repartidores
 *     description: Devuelve la lista de usuarios con rol REPARTIDOR y sus vehículos. Solo admin.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de repartidores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UsuarioConVehiculo'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/repartidores', authMiddleware, adminMiddleware, listarRepartidores);

// BUSCAR REPARTIDORES CON FILTROS
/**
 * @swagger
 * /api/usuarios/repartidores/buscar:
 *   get:
 *     summary: Buscar repartidores con filtros
 *     description: Filtra repartidores por nombre, ciudad, estado o placa. Solo admin.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nombre
 *         schema:
 *           type: string
 *         description: Filtro parcial por nombre
 *       - in: query
 *         name: ciudad
 *         schema:
 *           type: string
 *         description: Filtro parcial por ciudad
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: [ACTIVO, INACTIVO, SUSPENDIDO]
 *         description: Estado del repartidor
 *       - in: query
 *         name: placa
 *         schema:
 *           type: string
 *         description: Filtro parcial por placa del vehículo
 *     responses:
 *       200:
 *         description: Lista filtrada de repartidores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UsuarioConVehiculo'
 *                 total:
 *                   type: integer
 *                   example: 3
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/repartidores/buscar', authMiddleware, adminMiddleware, buscarRepartidores);

// OBTENER REPARTIDOR POR ID
/**
 * @swagger
 * /api/usuarios/repartidores/{id}:
 *   get:
 *     summary: Obtener un repartidor por ID
 *     description: Devuelve los datos de un repartidor y su cantidad de pedidos entregados. Solo admin.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
 *         example: 5
 *     responses:
 *       200:
 *         description: Datos del repartidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/UsuarioConVehiculo'
 *                     - type: object
 *                       properties:
 *                         pedidos_entregados:
 *                           type: integer
 *                           example: 12
 *                         pedidos_count:
 *                           type: integer
 *                           example: 12
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Repartidor no encontrado
 */
router.get('/repartidores/:id', authMiddleware, adminMiddleware, obtenerRepartidor);

// ACTUALIZAR REPARTIDOR
/**
 * @swagger
 * /api/usuarios/repartidores/{id}:
 *   put:
 *     summary: Actualizar un repartidor
 *     description: Actualiza los datos del repartidor y/o su vehículo. Solo admin.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ActualizarRepartidorRequest'
 *     responses:
 *       200:
 *         description: Repartidor actualizado exitosamente
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
 *                   example: Repartidor actualizado exitosamente
 *                 data:
 *                   $ref: '#/components/schemas/UsuarioConVehiculo'
 *       400:
 *         description: Datos inválidos o duplicados
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Repartidor no encontrado
 */
router.put('/repartidores/:id', authMiddleware, adminMiddleware, actualizarRepartidor);

// CAMBIAR ESTADO DE REPARTIDOR
/**
 * @swagger
 * /api/usuarios/repartidores/{id}/estado:
 *   patch:
 *     summary: Cambiar estado de un repartidor
 *     description: Actualiza el estado (ACTIVO, INACTIVO, SUSPENDIDO) de un repartidor. Solo admin.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
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
 *                 enum: [ACTIVO, INACTIVO, SUSPENDIDO]
 *                 example: ACTIVO
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
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
 *                   example: Estado del repartidor actualizado a ACTIVO
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 5
 *                     nombre_completo:
 *                       type: string
 *                       example: Juan Pérez
 *                     estado:
 *                       type: string
 *                       enum: [ACTIVO, INACTIVO, SUSPENDIDO]
 *       400:
 *         description: Estado inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Repartidor no encontrado
 */
router.patch('/repartidores/:id/estado', authMiddleware, adminMiddleware, cambiarEstadoRepartidor);

// ELIMINAR REPARTIDOR
/**
 * @swagger
 * /api/usuarios/repartidores/{id}:
 *   delete:
 *     summary: Eliminar un repartidor
 *     description: Elimina el usuario, su vehículo y sus roles asociados. Solo admin.
 *     tags: [Repartidores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del repartidor
 *     responses:
 *       200:
 *         description: Repartidor eliminado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeExito'
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 *       404:
 *         description: Repartidor no encontrado
 */
router.delete('/repartidores/:id', authMiddleware, adminMiddleware, eliminarRepartidor);

export default router;