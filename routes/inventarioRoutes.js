// routes/inventarioRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";
import upload from "../middlewares/upload.js";
import * as inventarioController from "../controllers/inventarioController.js";

const router = express.Router();

// ========== RUTAS PÚBLICAS (NO requieren autenticación) ==========

// Productos
/**
 * @swagger
 * /api/inventario/productos:
 *   get:
 *     summary: Obtener todos los productos
 *     description: Devuelve la lista completa de productos con su categoría e imagen.
 *     tags: [Inventario]
 *     responses:
 *       200:
 *         description: Lista de productos
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
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 *       500:
 *         description: Error interno del servidor
 */
router.get("/productos", inventarioController.getProductos);

/**
 * @swagger
 * /api/inventario/productos/destacados:
 *   get:
 *     summary: Obtener productos destacados
 *     description: Devuelve los últimos 6 productos agregados al inventario.
 *     tags: [Inventario]
 *     responses:
 *       200:
 *         description: Últimos 6 productos agregados
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
 *                   example: 6
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 *       500:
 *         description: Error interno del servidor
 */
router.get("/productos/destacados", inventarioController.getProductosDestacados);

/**
 * @swagger
 * /api/inventario/productos/buscar:
 *   get:
 *     summary: Buscar productos por texto
 *     description: Busca productos cuyo nombre, marca o descripción coincidan con el término.
 *     tags: [Inventario]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Término de búsqueda (nombre, marca o descripción)
 *         example: Rayban
 *     responses:
 *       200:
 *         description: Productos encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 query:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 *       400:
 *         description: Falta el término de búsqueda
 */
router.get("/productos/buscar", inventarioController.buscarProductos);

/**
 * @swagger
 * /api/inventario/productos/filtros:
 *   get:
 *     summary: Filtrar productos
 *     description: Filtra productos por precio, marca, color, material o categoría.
 *     tags: [Inventario]
 *     parameters:
 *       - in: query
 *         name: precio_min
 *         schema:
 *           type: number
 *         description: Precio mínimo
 *       - in: query
 *         name: precio_max
 *         schema:
 *           type: number
 *         description: Precio máximo
 *       - in: query
 *         name: marca
 *         schema:
 *           type: string
 *         description: Marca del producto
 *       - in: query
 *         name: color
 *         schema:
 *           type: string
 *         description: Color del producto
 *       - in: query
 *         name: material
 *         schema:
 *           type: string
 *         description: Material del producto
 *       - in: query
 *         name: id_categoria
 *         schema:
 *           type: integer
 *         description: ID de la categoría
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Búsqueda textual adicional
 *     responses:
 *       200:
 *         description: Productos filtrados
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
 *                 filtros:
 *                   type: object
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 */
router.get("/productos/filtros", inventarioController.filtrarProductos);

/**
 * @swagger
 * /api/inventario/productos/categoria/{id_categoria}:
 *   get:
 *     summary: Obtener productos por categoría
 *     tags: [Inventario]
 *     parameters:
 *       - in: path
 *         name: id_categoria
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la categoría
 *         example: 1
 *     responses:
 *       200:
 *         description: Productos de la categoría
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 id_categoria:
 *                   type: integer
 *                 count:
 *                   type: integer
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 */
router.get("/productos/categoria/:id_categoria", inventarioController.getProductosByCategoria);

/**
 * @swagger
 * /api/inventario/productos/marca/{marca}:
 *   get:
 *     summary: Obtener productos por marca
 *     tags: [Inventario]
 *     parameters:
 *       - in: path
 *         name: marca
 *         schema:
 *           type: string
 *         required: true
 *         description: Marca del producto
 *         example: Rayban
 *     responses:
 *       200:
 *         description: Productos de la marca
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 marca:
 *                   type: string
 *                 count:
 *                   type: integer
 *                 productos:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Producto'
 */
router.get("/productos/marca/:marca", inventarioController.getProductosByMarca);

/**
 * @swagger
 * /api/inventario/productos/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags: [Inventario]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del producto
 *         example: 1
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 producto:
 *                   $ref: '#/components/schemas/Producto'
 *       404:
 *         description: Producto no encontrado
 */
router.get("/productos/:id", inventarioController.getProductoById);

// Marcas y colores

/**
 * @swagger
 * /api/inventario/marcas:
 *   get:
 *     summary: Obtener todas las marcas disponibles
 *     tags: [Inventario]
 *     responses:
 *       200:
 *         description: Lista de marcas
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
 *                 marcas:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Rayban", "Oakley", "Vogue"]
 */
router.get("/marcas", inventarioController.getMarcas);

/**
 * @swagger
 * /api/inventario/colores:
 *   get:
 *     summary: Obtener todos los colores disponibles
 *     tags: [Inventario]
 *     responses:
 *       200:
 *         description: Lista de colores
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
 *                 colores:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Negro", "Café", "Dorado"]
 */
router.get("/colores", inventarioController.getColores);

// Categorías

/**
 * @swagger
 * /api/inventario/categorias:
 *   get:
 *     summary: Obtener todas las categorías
 *     tags: [Inventario]
 *     responses:
 *       200:
 *         description: Lista de categorías
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
 *                 categorias:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["ACCESORIOS", "GAFAS DE SOL", "MONTURAS"]
 */
router.get("/categorias", inventarioController.getCategorias);

// ========== RUTAS PROTEGIDAS (SOLO ADMIN) ==========

// Productos - CRUD admin

/**
 * @swagger
 * /api/inventario/productos:
 *   post:
 *     summary: Crear un nuevo producto (Admin)
 *     description: Crea un producto. Requiere rol ADMIN. La imagen se envía como archivo (multipart/form-data) y se sube a Cloudinary.
 *     tags: [Inventario (Admin)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - id_categoria
 *               - nombre
 *               - descripcion
 *               - marca
 *               - precio
 *               - material
 *               - color
 *               - imagen
 *             properties:
 *               id_categoria:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 description: 1=MONTURAS, 2=ACCESORIOS, 3=GAFAS DE SOL
 *                 example: 1
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *                 example: "Montura Elegance"
 *               descripcion:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *                 example: "Montura moderna de alta calidad"
 *               marca:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *                 example: "Rayban"
 *               precio:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 250000
 *               material:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *                 example: "Policarbonato"
 *               color:
 *                 type: string
 *                 example: "Negro"
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: Imagen del producto
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
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
 *                   example: Producto creado exitosamente
 *                 id_producto:
 *                   type: integer
 *                   example: 12
 *                 imagen_cloudinary:
 *                   type: string
 *       400:
 *         description: Datos inválidos o imagen faltante
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado (requiere admin)
 */
router.post("/productos", authMiddleware, adminMiddleware,upload.single("imagen"), inventarioController.createProducto);

/**
 * @swagger
 * /api/inventario/productos/{id}:
 *   put:
 *     summary: Actualizar un producto (Admin)
 *     description: Actualiza un producto existente. Si se envía nueva imagen, reemplaza la anterior en Cloudinary. Requiere rol ADMIN.
 *     tags: [Inventario (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del producto
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               id_categoria:
 *                 type: integer
 *                 enum: [1, 2, 3]
 *                 description: 1=MONTURAS, 2=ACCESORIOS, 3=GAFAS DE SOL
 *               nombre:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *               descripcion:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *               marca:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *               precio:
 *                 type: number
 *                 minimum: 0.01
 *               material:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 45
 *               color:
 *                 type: string
 *               imagen:
 *                 type: string
 *                 format: binary
 *                 description: Nueva imagen del producto (opcional)
 *     responses:
 *       200:
 *         description: Producto actualizado
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
 *                   example: Producto actualizado exitosamente
 *                 producto:
 *                   $ref: '#/components/schemas/Producto'
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado (requiere admin)
 *       404:
 *         description: Producto no encontrado
 */
router.put("/productos/:id", authMiddleware, adminMiddleware, upload.single("imagen"), inventarioController.updateProducto);

/**
 * @swagger
 * /api/inventario/productos/{id}:
 *   delete:
 *     summary: Eliminar un producto (Admin)
 *     description: Elimina un producto y su imagen de Cloudinary. Requiere rol ADMIN.
 *     tags: [Inventario (Admin)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID del producto
 *         example: 1
 *     responses:
 *       200:
 *         description: Producto eliminado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MensajeExito'
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado (requiere admin)
 *       404:
 *         description: Producto no encontrado
 */
router.delete("/productos/:id", authMiddleware, adminMiddleware, inventarioController.deleteProducto);

export default router;
