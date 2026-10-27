import express from 'express';
import { 
    login,
    verifyToken, 
    logout,
    solicitarRecuperacion,
    verificarTokenRecuperacion,
    resetearPassword
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// RUTAS PÚBLICAS
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario con email y contraseña y devuelve un token JWT.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *                   example: Login exitoso
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       $ref: '#/components/schemas/UsuarioBasico'
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Email o contraseña no enviados
 *       401:
 *         description: Credenciales inválidas
 *       403:
 *         description: Usuario inactivo
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', login);

// RUTAS DE RECUPERACIÓN DE CONTRASEÑA
/**
 * @swagger
 * /api/auth/recuperar-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     description: Envía un correo con un enlace para restablecer la contraseña.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@correo.com
 *     responses:
 *       200:
 *         description: Enlace de recuperación enviado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeExito'
 *       400:
 *         description: Email no enviado o con formato inválido
 *       404:
 *         description: No existe una cuenta con ese email
 *       500:
 *         description: Error al enviar el correo
 */
router.post('/recuperar-password', solicitarRecuperacion);
/**
 * @swagger
 * /api/auth/verificar-token/{token}:
 *   get:
 *     summary: Verificar token de recuperación
 *     description: Verifica si un token de recuperación es válido y no ha expirado.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de recuperación enviado por correo
 *         example: a1b2c3d4e5f6...
 *     responses:
 *       200:
 *         description: Token válido
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
 *                   example: Token válido
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       format: email
 *                     nombre_completo:
 *                       type: string
 *       400:
 *         description: Token inválido o expirado
 */
router.get('/verificar-token/:token', verificarTokenRecuperacion);
/**
 * @swagger
 * /api/auth/resetear-password:
 *   post:
 *     summary: Restablecer contraseña
 *     description: Cambia la contraseña del usuario usando un token válido de recuperación.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - nueva_contrasena
 *             properties:
 *               token:
 *                 type: string
 *                 example: a1b2c3d4e5f6...
 *               nueva_contrasena:
 *                 type: string
 *                 minLength: 8
 *                 example: NuevaClave123
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeExito'
 *       400:
 *         description: Token inválido, expirado, o contraseña demasiado corta
 *       500:
 *         description: Error al guardar la contraseña
 */
router.post('/resetear-password', resetearPassword);

// RUTAS PROTEGIDAS (requieren autenticación)
/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     summary: Verificar token JWT
 *     description: Devuelve los datos del usuario autenticado a partir del token JWT.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token válido, datos del usuario
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
 *                     usuario:
 *                       $ref: '#/components/schemas/UsuarioConEstado'
 *       401:
 *         description: Token inválido o no enviado
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/verify', authMiddleware, verifyToken);
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     description: Cierra la sesión del usuario (el token se invalida del lado del cliente).
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeExito'
 *       401:
 *         description: Token inválido o no enviado
 */
router.post('/logout', authMiddleware, logout);

export default router;