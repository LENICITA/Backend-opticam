import express from 'express';
import {
    reporteVentasPorPeriodo,
    reporteProductosMasVendidos,
    reporteDesempenoRepartidores,
    reporteEstadoPedidos,
    reporteClientesFrecuentes,
    reporteResumenGeneral,
    reporteVentasPorCategoria,
    reporteAnalisisFormulas,
    generarReportePDF
} from '../controllers/reportController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Todos los reportes requieren autenticación y permisos de admin
router.use(authMiddleware, adminMiddleware);

// RUTA PARA GENERAR PDF (NUEVA)
/**
 * @swagger
 * /api/reportes/generar-pdf:
 *   post:
 *     summary: Generar reporte en PDF (Admin)
 *     description: |
 *       Genera un PDF de uno de los 7 tipos de reporte soportados. Devuelve un archivo binario `application/pdf`.
 *
 *       Tipos disponibles:
 *       - `ventas`
 *       - `inventario`
 *       - `repartidores`
 *       - `clientes`
 *       - `productos-mas-vendidos`
 *       - `estado-pedidos`
 *       - `ventas-categoria`
 *
 *       Períodos disponibles: `diario`, `semanal`, `mensual`, `anual`, `personalizado`.
 *       Si el período es `personalizado`, se requieren `fecha_inicio` y `fecha_fin`.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipo
 *               - periodo
 *             properties:
 *               tipo:
 *                 type: string
 *                 enum: [ventas, inventario, repartidores, clientes, productos-mas-vendidos, estado-pedidos, ventas-categoria]
 *                 example: ventas
 *               periodo:
 *                 type: string
 *                 enum: [diario, semanal, mensual, anual, personalizado]
 *                 example: mensual
 *               fecha_inicio:
 *                 type: string
 *                 format: date
 *                 description: Requerido si periodo = personalizado
 *                 example: "2026-01-01"
 *               fecha_fin:
 *                 type: string
 *                 format: date
 *                 description: Requerido si periodo = personalizado
 *                 example: "2026-09-30"
 *     responses:
 *       200:
 *         description: PDF generado
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Tipo, período o fechas inválidas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado (requiere admin)
 *       500:
 *         description: Error al generar el PDF
 */
router.post('/generar-pdf', generarReportePDF);

// Reportes existentes
/**
 * @swagger
 * /api/reportes/ventas-periodo:
 *   get:
 *     summary: Reporte de ventas por período (Admin)
 *     description: Devuelve el resumen de ventas y el detalle por día entre dos fechas.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-01-01"
 *       - in: query
 *         name: fecha_fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-09-30"
 *     responses:
 *       200:
 *         description: Reporte de ventas
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
 *                     periodo:
 *                       type: object
 *                       properties:
 *                         fecha_inicio: { type: string, format: date }
 *                         fecha_fin: { type: string, format: date }
 *                     resumen:
 *                       type: object
 *                       properties:
 *                         total_pedidos: { type: integer, example: 120 }
 *                         ventas_totales: { type: number, example: 35000000 }
 *                         total_envios: { type: number, example: 1200000 }
 *                         promedio_venta: { type: number, example: 291666 }
 *                         clientes_unicos: { type: integer, example: 85 }
 *                     detalle_por_dia:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           fecha: { type: string, format: date }
 *                           total_pedidos: { type: integer }
 *                           ventas_totales: { type: number }
 *                           total_envios: { type: number }
 *                           promedio_venta: { type: number }
 *       400:
 *         description: Fechas inválidas o faltantes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/ventas-periodo', reporteVentasPorPeriodo);
/**
 * @swagger
 * /api/reportes/productos-mas-vendidos:
 *   get:
 *     summary: Reporte de productos más vendidos (Admin)
 *     description: Devuelve los productos más vendidos, con filtro de fechas opcional y límite configurable.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         example: 10
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-01-01"
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *         example: "2026-09-30"
 *     responses:
 *       200:
 *         description: Lista de productos más vendidos
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
 *                     type: object
 *                     properties:
 *                       id_producto: { type: integer }
 *                       producto: { type: string }
 *                       marca: { type: string }
 *                       precio: { type: number }
 *                       categoria: { type: string }
 *                       total_vendidos: { type: integer }
 *                       ingreso_total: { type: number }
 *       400:
 *         description: Límite inválido o fechas inválidas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/productos-mas-vendidos', reporteProductosMasVendidos);
/**
 * @swagger
 * /api/reportes/desempeno-repartidores:
 *   get:
 *     summary: Reporte de desempeño de repartidores (Admin)
 *     description: Devuelve las métricas de cada repartidor (pedidos asignados, entregados, valor entregado).
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Desempeño de repartidores
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
 *                     type: object
 *                     properties:
 *                       id_usuario: { type: integer }
 *                       repartidor: { type: string }
 *                       telefono: { type: string }
 *                       ciudad: { type: string }
 *                       tipo_vehiculo: { type: string }
 *                       placa: { type: string }
 *                       pedidos_asignados: { type: integer }
 *                       pedidos_entregados: { type: integer }
 *                       valor_total_entregas: { type: number }
 *                       promedio_venta: { type: number }
 *                       usuario_estado: { type: string }
 *       400:
 *         description: Fechas inválidas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/desempeno-repartidores', reporteDesempenoRepartidores);
/**
 * @swagger
 * /api/reportes/estado-pedidos:
 *   get:
 *     summary: Reporte de estado de pedidos (Admin)
 *     description: Devuelve cuántos pedidos hay por estado, con montos, promedios, mínimos y máximos.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Estado de pedidos
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
 *                     resumen:
 *                       type: object
 *                       properties:
 *                         total_pedidos: { type: integer, example: 120 }
 *                         monto_total: { type: number, example: 35000000 }
 *                     detalle:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           estado: { type: string }
 *                           cantidad: { type: integer }
 *                           monto_total: { type: number }
 *                           promedio: { type: number }
 *                           minimo: { type: number }
 *                           maximo: { type: number }
 *       400:
 *         description: Fechas inválidas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/estado-pedidos', reporteEstadoPedidos);
/**
 * @swagger
 * /api/reportes/clientes-frecuentes:
 *   get:
 *     summary: Reporte de clientes frecuentes (Admin)
 *     description: Devuelve los clientes que más han comprado, ordenados por total gastado.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limite
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         example: 10
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Clientes frecuentes
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
 *                     type: object
 *                     properties:
 *                       id_usuario: { type: integer }
 *                       cliente: { type: string }
 *                       email: { type: string, format: email }
 *                       telefono: { type: string }
 *                       ciudad: { type: string }
 *                       total_pedidos: { type: integer }
 *                       total_gastado: { type: number }
 *                       promedio_gasto: { type: number }
 *                       mayor_compra: { type: number }
 *                       menor_compra: { type: number }
 *       400:
 *         description: Límite o fechas inválidas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/clientes-frecuentes', reporteClientesFrecuentes);
/**
 * @swagger
 * /api/reportes/resumen-general:
 *   get:
 *     summary: Resumen general del sistema (Admin)
 *     description: "Devuelve KPIs globales: clientes, repartidores, productos, pedidos, ingresos, fórmulas aprobadas/pendientes y los ingresos de los últimos 6 meses."
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen general
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
 *                     clientes: { type: integer, example: 150 }
 *                     repartidores: { type: integer, example: 8 }
 *                     productos: { type: integer, example: 45 }
 *                     pedidos_totales: { type: integer, example: 320 }
 *                     ingresos_totales: { type: number, example: 95000000 }
 *                     pedidos_ultimo_mes: { type: integer, example: 25 }
 *                     ingresos_ultimo_mes: { type: number, example: 7000000 }
 *                     formulas_aprobadas: { type: integer, example: 60 }
 *                     formulas_pendientes: { type: integer, example: 10 }
 *                     ingresos_por_mes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           mes: { type: string, example: "2026-09" }
 *                           pedidos: { type: integer }
 *                           ingresos: { type: number }
 *                           envios: { type: number }
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/resumen-general', reporteResumenGeneral);
/**
 * @swagger
 * /api/reportes/ventas-categoria:
 *   get:
 *     summary: Reporte de ventas por categoría (Admin)
 *     description: Devuelve las ventas agrupadas por categoría (MONTURAS, ACCESORIOS, GAFAS DE SOL).
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Ventas por categoría
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
 *                     resumen:
 *                       type: object
 *                       properties:
 *                         total_unidades: { type: integer, example: 200 }
 *                         total_ingresos: { type: number, example: 35000000 }
 *                     detalle:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categoria: { type: string }
 *                           pedidos: { type: integer }
 *                           unidades_vendidas: { type: integer }
 *                           ingresos: { type: number }
 *                           precio_promedio: { type: number }
 *       400:
 *         description: Fechas inválidas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/ventas-categoria', reporteVentasPorCategoria);
/**
 * @swagger
 * /api/reportes/analisis-formulas:
 *   get:
 *     summary: Análisis de fórmulas médicas (Admin)
 *     description: Devuelve la distribución de fórmulas por condición, la tendencia mensual de los últimos 6 meses y estadísticas por estado.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Análisis de fórmulas
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
 *                     distribucion_condiciones:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           condicion: { type: string }
 *                           cantidad: { type: integer }
 *                           costo_promedio: { type: number }
 *                           costo_total: { type: number }
 *                           clientes_unicos: { type: integer }
 *                     tendencia_mensual:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           mes: { type: string, example: "2026-09" }
 *                           nuevas_formulas: { type: integer }
 *                           costo_promedio: { type: number }
 *                           aprobadas: { type: integer }
 *                     estadisticas_estado:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           estado: { type: string }
 *                           total: { type: integer }
 *                           costo_promedio: { type: number }
 *                     total_formulas_aprobadas: { type: integer, example: 60 }
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No autorizado
 */
router.get('/analisis-formulas', reporteAnalisisFormulas);

export default router;