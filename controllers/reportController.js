import sequelize from "../config/database.js";
import PDFDocument from 'pdfkit';
import Inventario from '../models/inventario.js';
import {
    generarGraficoBarras,
    generarGraficoLineas,
    generarGraficoDona,
    generarGraficoBarrasHorizontales
} from '../utils/chartGenerator.js';

const manejarErrorValidacion = (error, res) => {
  if (error.name === 'SequelizeValidationError') {
    const mensajes = error.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: mensajes[0],
      errores: mensajes
    });
  }

  if (error.name === 'SequelizeDatabaseError') {
    console.error('Error de base de datos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud en la base de datos'
    });
  }

  console.error('Error interno no controlado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const TIPOS_PDF_VALIDOS = [
  'ventas',
  'inventario',
  'repartidores',
  'clientes',
  'productos-mas-vendidos',
  'estado-pedidos',
  'ventas-categoria'
];

const PERIODOS_VALIDOS = ['diario', 'semanal', 'mensual', 'anual', 'personalizado'];

const LIMITE_MAX = 100;

const validarFecha = (fecha) => {
  if (!fecha || typeof fecha !== 'string') return false;
  if (!REGEX_FECHA.test(fecha)) return false;
  const date = new Date(`${fecha}T00:00:00`);
  return !isNaN(date.getTime());
};

const validarRangoFechas = (fechaInicio, fechaFin) => {
  if (!validarFecha(fechaInicio) || !validarFecha(fechaFin)) return false;
  const inicio = new Date(`${fechaInicio}T00:00:00`);
  const fin = new Date(`${fechaFin}T00:00:00`);
  return inicio <= fin;
};

const validarLimite = (limite) => {
  const num = Number(limite);
  if (isNaN(num)) return false;
  if (!Number.isInteger(num)) return false;
  if (num < 1 || num > LIMITE_MAX) return false;
  return true;
};

export const reporteVentasPorPeriodo = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren fechas de inicio y fin (YYYY-MM-DD)'
            });
        }

        if (!validarRangoFechas(fecha_inicio, fecha_fin)) {
      return res.status(400).json({
        success: false,
        message: 'Fechas inválidas. Deben tener formato YYYY-MM-DD y la fecha de inicio debe ser menor o igual a la fecha fin'
      });
    }

        const query = `
            SELECT 
                DATE(p.fecha_pedido) as fecha,
                COUNT(DISTINCT p.id_pedido) as total_pedidos,
                SUM(p.total) as ventas_totales,
                SUM(p.costo_envio) as total_envios,
                AVG(p.total) as promedio_venta
            FROM PEDIDOS p
            WHERE p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
            AND p.estado != 'CANCELADO'
            GROUP BY DATE(p.fecha_pedido)
            ORDER BY fecha DESC
        `;

        const results = await sequelize.query(query, {
            replacements: { fecha_inicio, fecha_fin },
            type: sequelize.QueryTypes.SELECT
        });

        const queryResumen = `
            SELECT 
                COUNT(DISTINCT id_pedido) as total_pedidos,
                SUM(total) as ventas_totales,
                SUM(costo_envio) as total_envios,
                AVG(total) as promedio_venta,
                COUNT(DISTINCT id_usuario) as clientes_unicos
            FROM PEDIDOS
            WHERE fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
            AND estado != 'CANCELADO'
        `;

        const [resumen] = await sequelize.query(queryResumen, {
            replacements: { fecha_inicio, fecha_fin },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                periodo: { fecha_inicio, fecha_fin },
                resumen: resumen,
                detalle_por_dia: results
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const reporteProductosMasVendidos = async (req, res) => {
    try {
        const { limite = 10, fecha_inicio, fecha_fin } = req.query;

        if (!validarLimite(limite)) {
      return res.status(400).json({
        success: false,
        message: `El límite debe ser un número entero entre 1 y ${LIMITE_MAX}`
      });
    }

    if ((fecha_inicio && !fecha_fin) || (!fecha_inicio && fecha_fin)) {
      return res.status(400).json({
        success: false,
        message: 'Debes enviar ambas fechas o ninguna'
      });
    }

    if (fecha_inicio && fecha_fin && !validarRangoFechas(fecha_inicio, fecha_fin)) {
      return res.status(400).json({
        success: false,
        message: 'Fechas inválidas. Deben tener formato YYYY-MM-DD y la fecha de inicio debe ser menor o igual a la fecha fin'
      });
    }

        let whereClause = '';
        const replacements = { limite: parseInt(limite) };

        if (fecha_inicio && fecha_fin) {
            whereClause = 'AND p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin';
            replacements.fecha_inicio = fecha_inicio;
            replacements.fecha_fin = fecha_fin;
        }

        const query = `
            SELECT 
                pr.id_producto,
                pr.nombre as producto,
                pr.marca,
                pr.precio,
                c.tipo_categoria as categoria,
                SUM(pp.cant_productos) as total_vendidos,
                SUM(pp.cant_productos * pr.precio) as ingreso_total
            FROM PEDIDOS_PRODUCTOS pp
            INNER JOIN PRODUCTOS pr ON pp.id_producto = pr.id_producto
            INNER JOIN CATEGORIAS c ON pr.id_categoria = c.id_categoria
            INNER JOIN PEDIDOS p ON pp.id_pedido = p.id_pedido
            WHERE p.estado != 'CANCELADO'
            ${whereClause}
            GROUP BY pr.id_producto, pr.nombre, pr.marca, pr.precio, c.tipo_categoria
            ORDER BY total_vendidos DESC
            LIMIT :limite
        `;

        const results = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: results });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const reporteDesempenoRepartidores = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        if (fecha_inicio && fecha_fin && !validarRangoFechas(fecha_inicio, fecha_fin)) {
      return res.status(400).json({
        success: false,
        message: 'Fechas inválidas. Deben tener formato YYYY-MM-DD y la fecha de inicio debe ser menor o igual a la fecha fin'
      });
    }

        let whereClause = '';
        const replacements = {};

        if (fecha_inicio && fecha_fin) {
            whereClause = 'AND d.fecha_entrega BETWEEN :fecha_inicio AND :fecha_fin';
            replacements.fecha_inicio = fecha_inicio;
            replacements.fecha_fin = fecha_fin;
        }

        const query = `
            SELECT 
                u.id_usuario,
                u.nombre_completo as repartidor,
                u.telefono,
                u.ciudad,
                v.tipo as tipo_vehiculo,
                v.placa,
                COUNT(DISTINCT d.id_pedido) as pedidos_asignados,
                SUM(CASE WHEN d.estado = 'ENTREGADO' THEN 1 ELSE 0 END) as pedidos_entregados,
                SUM(CASE WHEN d.estado = 'ENTREGADO' THEN p.total ELSE 0 END) as valor_total_entregas,
                AVG(CASE WHEN d.estado = 'ENTREGADO' THEN p.total ELSE NULL END) as promedio_venta,
                u.estado as usuario_estado
            FROM USUARIOS u
            INNER JOIN VEHICULOS v ON u.id_usuario = v.id_usuario
            INNER JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
            INNER JOIN ROLES r ON ru.id_rol = r.id_rol
            INNER JOIN DISTRIBUCIONES d ON u.id_usuario = d.id_usuario
            LEFT JOIN PEDIDOS p ON d.id_pedido = p.id_pedido
            WHERE r.nombre = 'REPARTIDOR'
            ${whereClause}
            GROUP BY u.id_usuario, u.nombre_completo, u.telefono, u.ciudad, v.tipo, v.placa, u.estado
            ORDER BY pedidos_entregados DESC, pedidos_asignados DESC
        `;

        const results = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: results });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const reporteEstadoPedidos = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        if (fecha_inicio && fecha_fin && !validarRangoFechas(fecha_inicio, fecha_fin)) {
      return res.status(400).json({
        success: false,
        message: 'Fechas inválidas. Deben tener formato YYYY-MM-DD y la fecha de inicio debe ser menor o igual a la fecha fin'
      });
    }

        let whereClause = '';
        const replacements = {};

        if (fecha_inicio && fecha_fin) {
            whereClause = 'WHERE fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin';
            replacements.fecha_inicio = fecha_inicio;
            replacements.fecha_fin = fecha_fin;
        }

        const query = `
            SELECT 
                estado,
                COUNT(*) as cantidad,
                SUM(total) as monto_total,
                AVG(total) as promedio,
                MIN(total) as minimo,
                MAX(total) as maximo
            FROM PEDIDOS
            ${whereClause}
            GROUP BY estado
            ORDER BY 
                CASE estado
                    WHEN 'Pendiente' THEN 1
                    WHEN 'Abonado' THEN 2
                    WHEN 'Listo' THEN 3
                    WHEN 'Pagado' THEN 4
                    WHEN 'En Proceso' THEN 5
                    WHEN 'Enviado' THEN 6
                    WHEN 'Entregado' THEN 7
                    WHEN 'Cancelado' THEN 8
                    ELSE 9
                END
        `;

        const results = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const totales = results.reduce((acc, item) => {
            acc.total_pedidos += parseInt(item.cantidad);
            acc.monto_total += parseFloat(item.monto_total);
            return acc;
        }, { total_pedidos: 0, monto_total: 0 });

        res.json({
            success: true,
            data: { resumen: totales, detalle: results }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const reporteClientesFrecuentes = async (req, res) => {
    try {
        const { limite = 10, fecha_inicio, fecha_fin } = req.query;

        if (!validarLimite(limite)) {
      return res.status(400).json({
        success: false,
        message: `El límite debe ser un número entero entre 1 y ${LIMITE_MAX}`
      });
    }

    if (fecha_inicio && fecha_fin && !validarRangoFechas(fecha_inicio, fecha_fin)) {
      return res.status(400).json({
        success: false,
        message: 'Fechas inválidas. Deben tener formato YYYY-MM-DD y la fecha de inicio debe ser menor o igual a la fecha fin'
      });
    }

        let whereClause = '';
        const replacements = { limite: parseInt(limite) };

        if (fecha_inicio && fecha_fin) {
            whereClause = 'AND p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin';
            replacements.fecha_inicio = fecha_inicio;
            replacements.fecha_fin = fecha_fin;
        }

        const query = `
            SELECT 
                u.id_usuario,
                u.nombre_completo as cliente,
                u.email,
                u.telefono,
                u.ciudad,
                COUNT(p.id_pedido) as total_pedidos,
                SUM(p.total) as total_gastado,
                AVG(p.total) as promedio_gasto,
                MAX(p.total) as mayor_compra,
                MIN(p.total) as menor_compra
            FROM USUARIOS u
            INNER JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
            INNER JOIN ROLES r ON ru.id_rol = r.id_rol
            INNER JOIN PEDIDOS p ON u.id_usuario = p.id_usuario
            WHERE r.nombre = 'CLIENTE'
            AND p.estado != 'CANCELADO'
            ${whereClause}
            GROUP BY u.id_usuario, u.nombre_completo, u.email, u.telefono, u.ciudad
            HAVING total_pedidos > 0
            ORDER BY total_gastado DESC
            LIMIT :limite
        `;

        const results = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: results });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const reporteResumenGeneral = async (req, res) => {
    try {
        const queries = {
            total_clientes: `
                SELECT COUNT(*) as total 
                FROM USUARIOS u
                INNER JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
                INNER JOIN ROLES r ON ru.id_rol = r.id_rol
                WHERE r.nombre = 'CLIENTE'
            `,
            total_repartidores: `
                SELECT COUNT(*) as total 
                FROM USUARIOS u
                INNER JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
                INNER JOIN ROLES r ON ru.id_rol = r.id_rol
                WHERE r.nombre = 'REPARTIDOR'
            `,
            total_productos: `SELECT COUNT(*) as total FROM PRODUCTOS`,
            total_pedidos: `
                SELECT COUNT(*) as total, SUM(total) as monto_total 
                FROM PEDIDOS 
                WHERE estado != 'Cancelado'
            `,
            pedidos_ultimo_mes: `
                SELECT COUNT(*) as total, SUM(total) as monto_total 
                FROM PEDIDOS 
                WHERE fecha_pedido >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                AND estado != 'Cancelado'
            `,
            formulas_aprobadas: `
                SELECT COUNT(*) as total 
                FROM FORMULAS 
                WHERE estado = 'Aprobado'
            `,
            formulas_pendientes: `
                SELECT COUNT(*) as total 
                FROM FORMULAS 
                WHERE estado = 'Pendiente'
            `,
            ingresos_por_mes: `
                SELECT 
                    DATE_FORMAT(fecha_pedido, '%Y-%m') as mes,
                    COUNT(*) as pedidos,
                    SUM(total) as ingresos,
                    SUM(costo_envio) as envios
                FROM PEDIDOS 
                WHERE estado != 'Cancelado'
                AND fecha_pedido >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(fecha_pedido, '%Y-%m')
                ORDER BY mes DESC
                LIMIT 6
            `
        };

        const results = {};

        for (const [key, query] of Object.entries(queries)) {
            const [result] = await sequelize.query(query, {
                type: sequelize.QueryTypes.SELECT
            });
            results[key] = result;
        }

        res.json({
            success: true,
            data: {
                clientes: results.total_clientes?.total || 0,
                repartidores: results.total_repartidores?.total || 0,
                productos: results.total_productos?.total || 0,
                pedidos_totales: results.total_pedidos?.total || 0,
                ingresos_totales: results.total_pedidos?.monto_total || 0,
                pedidos_ultimo_mes: results.pedidos_ultimo_mes?.total || 0,
                ingresos_ultimo_mes: results.pedidos_ultimo_mes?.monto_total || 0,
                formulas_aprobadas: results.formulas_aprobadas?.total || 0,
                formulas_pendientes: results.formulas_pendientes?.total || 0,
                ingresos_por_mes: results.ingresos_por_mes || []
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const reporteVentasPorCategoria = async (req, res) => {
    try {
        const { fecha_inicio, fecha_fin } = req.query;

        if (fecha_inicio && fecha_fin && !validarRangoFechas(fecha_inicio, fecha_fin)) {
      return res.status(400).json({
        success: false,
        message: 'Fechas inválidas. Deben tener formato YYYY-MM-DD y la fecha de inicio debe ser menor o igual a la fecha fin'
      });
    }

        let whereClause = '';
        const replacements = {};

        if (fecha_inicio && fecha_fin) {
            whereClause = 'AND p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin';
            replacements.fecha_inicio = fecha_inicio;
            replacements.fecha_fin = fecha_fin;
        }

        const query = `
            SELECT 
                c.tipo_categoria as categoria,
                COUNT(DISTINCT p.id_pedido) as pedidos,
                SUM(pp.cant_productos) as unidades_vendidas,
                SUM(pp.cant_productos * pr.precio) as ingresos,
                AVG(pr.precio) as precio_promedio
            FROM CATEGORIAS c
            INNER JOIN PRODUCTOS pr ON c.id_categoria = pr.id_categoria
            INNER JOIN PEDIDOS_PRODUCTOS pp ON pr.id_producto = pp.id_producto
            INNER JOIN PEDIDOS p ON pp.id_pedido = p.id_pedido
            WHERE p.estado != 'Cancelado'
            ${whereClause}
            GROUP BY c.id_categoria, c.tipo_categoria
            ORDER BY ingresos DESC
        `;

        const results = await sequelize.query(query, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const totales = results.reduce((acc, item) => {
            acc.total_unidades += parseInt(item.unidades_vendidas || 0);
            acc.total_ingresos += parseFloat(item.ingresos || 0);
            return acc;
        }, { total_unidades: 0, total_ingresos: 0 });

        res.json({
            success: true,
            data: { resumen: totales, detalle: results }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const reporteAnalisisFormulas = async (req, res) => {
    try {
        const query = `
            SELECT 
                f.condicion,
                COUNT(*) as cantidad,
                AVG(f.costo) as costo_promedio,
                SUM(f.costo) as costo_total,
                COUNT(DISTINCT f.id_usuario) as clientes_unicos
            FROM FORMULAS f
            WHERE f.estado = 'Aprobado'
            GROUP BY f.condicion
            ORDER BY cantidad DESC
        `;

        const results = await sequelize.query(query, {
            type: sequelize.QueryTypes.SELECT
        });

        const queryTendencia = `
            SELECT 
                DATE_FORMAT(f.fecha_creacion, '%Y-%m') as mes,
                COUNT(*) as nuevas_formulas,
                AVG(f.costo) as costo_promedio,
                SUM(CASE WHEN f.estado = 'Aprobado' THEN 1 ELSE 0 END) as aprobadas
            FROM FORMULAS f
            WHERE f.fecha_creacion >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(f.fecha_creacion, '%Y-%m')
            ORDER BY mes DESC
        `;

        const tendencia = await sequelize.query(queryTendencia, {
            type: sequelize.QueryTypes.SELECT
        });

        const queryEstadisticas = `
            SELECT 
                estado,
                COUNT(*) as total,
                AVG(costo) as costo_promedio
            FROM FORMULAS
            GROUP BY estado
        `;

        const estadisticas = await sequelize.query(queryEstadisticas, {
            type: sequelize.QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: {
                distribucion_condiciones: results,
                tendencia_mensual: tendencia,
                estadisticas_estado: estadisticas,
                total_formulas_aprobadas: results.reduce((acc, item) => acc + parseInt(item.cantidad), 0)
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

export const generarReportePDF = async (req, res) => {
    try {
        const { tipo, periodo, fecha_inicio, fecha_fin } = req.body;

        if (!tipo || !TIPOS_PDF_VALIDOS.includes(tipo)) {
            return res.status(400).json({
                success: false,
                message: `Tipo de reporte inválido. Debe ser uno de: ${TIPOS_PDF_VALIDOS.join(', ')}`
            });
        }

        if (!periodo || !PERIODOS_VALIDOS.includes(periodo)) {
            return res.status(400).json({
                success: false,
                message: `Período inválido. Debe ser uno de: ${PERIODOS_VALIDOS.join(', ')}`
            });
        }

        if (periodo === 'personalizado') {
            if (!fecha_inicio || !fecha_fin) {
                return res.status(400).json({
                    success: false,
                    message: 'Debes enviar fecha_inicio y fecha_fin para el período personalizado'
                });
            }

            if (!validarRangoFechas(fecha_inicio, fecha_fin)) {
                return res.status(400).json({
                    success: false,
                    message: 'Fechas inválidas. Deben tener formato YYYY-MM-DD y la fecha de inicio debe ser menor o igual a la fecha fin'
                });
            }
        }

        console.log(`Generando PDF: ${tipo} - ${periodo}`);

        let datos = await obtenerDatosParaPDF(tipo, periodo, fecha_inicio, fecha_fin);

        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            bufferPages: true,
            info: {
                Title: `Reporte de ${tipo}`,
                Author: 'Óptica Balamb',
                Subject: `Reporte generado el ${new Date().toLocaleDateString('es-CO')}`
            }
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_${tipo}_${new Date().toISOString().split('T')[0]}.pdf`);

        doc.pipe(res);

        res.on('finish', () => console.log('PDF enviado correctamente'));
        res.on('error', (err) => console.error('Error en stream:', err));

        await dibujarReportePDF(doc, datos, tipo, periodo);
        doc.end();

    } catch (error) {
        console.error('Error al generar PDF:', error);
        if (!res.headersSent) {
            return manejarErrorValidacion(error, res);
        }
    }
};


const obtenerDatosParaPDF = async (tipo, periodo, fechaInicio, fechaFin) => {
    const hoy = new Date();
    let fechaDesde = new Date();
    let fechaHasta = new Date();

    switch (periodo) {
        case 'diario':
            fechaDesde.setHours(0, 0, 0, 0);
            fechaHasta.setHours(23, 59, 59, 999);
            break;
        case 'semanal':
            fechaDesde.setDate(hoy.getDate() - 7);
            fechaDesde.setHours(0, 0, 0, 0);
            break;
        case 'mensual':
            fechaDesde.setMonth(hoy.getMonth() - 1);
            fechaDesde.setHours(0, 0, 0, 0);
            break;
        case 'anual':
            fechaDesde.setFullYear(hoy.getFullYear() - 1);
            fechaDesde.setHours(0, 0, 0, 0);
            break;
        default:
            fechaDesde.setDate(hoy.getDate() - 30);
            fechaDesde.setHours(0, 0, 0, 0);
    }

    if (fechaInicio && fechaFin) {
        fechaDesde = new Date(fechaInicio);
        fechaHasta = new Date(fechaFin);
    }

    const replacements = {
        fecha_inicio: fechaDesde.toISOString().split('T')[0],
        fecha_fin: fechaHasta.toISOString().split('T')[0]
    };

    let datos = {};

    switch (tipo) {
        case 'ventas':
            datos = await obtenerDatosVentasSQL(replacements);
            break;
        case 'inventario':
            datos = await obtenerDatosInventarioSQL();
            break;
        case 'repartidores':
            datos = await obtenerDatosRepartidoresSQL(replacements);
            break;
        case 'clientes':
            datos = await obtenerDatosClientesSQL(replacements);
            break;
        case 'productos-mas-vendidos':
            datos = await obtenerProductosMasVendidosSQL(replacements);
            break;
        case 'estado-pedidos':
            datos = await obtenerEstadoPedidosSQL(replacements);
            break;
        case 'ventas-categoria':
            datos = await obtenerVentasCategoriaSQL(replacements);
            break;
        default:
            throw new Error('Tipo de reporte no válido');
    }

    return {
        ...datos,
        fechaGeneracion: new Date().toLocaleString('es-CO'),
        periodo: periodo,
        tipo: tipo,
        fechaInicio: fechaDesde.toISOString().split('T')[0],
        fechaFin: fechaHasta.toISOString().split('T')[0]
    };
};

const obtenerDatosVentasSQL = async (replacements) => {
    const query = `
        SELECT 
            DATE(p.fecha_pedido) as fecha,
            COUNT(DISTINCT p.id_pedido) as total_pedidos,
            SUM(p.total) as ventas_totales,
            AVG(p.total) as promedio_venta,
            COUNT(DISTINCT p.id_usuario) as clientes_unicos
        FROM PEDIDOS p
        WHERE p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
        AND p.estado != 'Cancelado'
        GROUP BY DATE(p.fecha_pedido)
        ORDER BY fecha DESC
    `;

    const detalle = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    const resumenQuery = `
        SELECT 
            COUNT(DISTINCT id_pedido) as total_pedidos,
            SUM(total) as ventas_totales,
            AVG(total) as promedio_venta,
            COUNT(DISTINCT id_usuario) as clientes_unicos
        FROM PEDIDOS
        WHERE fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
        AND estado != 'Cancelado'
    `;

    const [resumen] = await sequelize.query(resumenQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    return { titulo: 'Reporte de Ventas', resumen, detalle };
};

const obtenerDatosInventarioSQL = async () => {
    const productos = await Inventario.getAll();

    const totalProductos = productos.length;
    const valorTotal = productos.reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0);

    const porCategoria = {};
    productos.forEach(p => {
        const cat = p.tipo_categoria || 'Sin categoría';
        if (!porCategoria[cat]) porCategoria[cat] = { cantidad: 0, valor: 0 };
        porCategoria[cat].cantidad++;
        porCategoria[cat].valor += parseFloat(p.precio) || 0;
    });

    return {
        titulo: 'Reporte de Inventario',
        totalProductos,
        valorTotal,
        porCategoria,
        productos: productos.slice(0, 20)
    };
};

const obtenerDatosRepartidoresSQL = async (replacements) => {
    const query = `
        SELECT 
            u.id_usuario,
            u.nombre_completo as repartidor,
            u.telefono,
            u.ciudad,
            v.tipo as tipo_vehiculo,
            v.modelo,
            v.placa,
            COUNT(DISTINCT d.id_pedido) as pedidos_asignados,
            SUM(CASE WHEN d.estado = 'ENTREGADO' THEN 1 ELSE 0 END) as pedidos_entregados,
            SUM(CASE WHEN d.estado = 'ENTREGADO' THEN p.total ELSE 0 END) as valor_entregas,
            u.estado as usuario_estado
        FROM USUARIOS u
        INNER JOIN VEHICULOS v ON u.id_usuario = v.id_usuario
        INNER JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
        INNER JOIN ROLES r ON ru.id_rol = r.id_rol
        INNER JOIN DISTRIBUCIONES d ON u.id_usuario = d.id_usuario
        LEFT JOIN PEDIDOS p ON d.id_pedido = p.id_pedido
        WHERE r.nombre = 'REPARTIDOR'
        AND d.fecha_entrega BETWEEN :fecha_inicio AND :fecha_fin
        GROUP BY u.id_usuario, u.nombre_completo, u.telefono, u.ciudad, v.tipo, v.modelo, v.placa, u.estado
        ORDER BY pedidos_entregados DESC, pedidos_asignados DESC
    `;

    const repartidores = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    return {
        titulo: 'Reporte de Repartidores',
        totalRepartidores: repartidores.length,
        repartidores
    };
};

const obtenerDatosClientesSQL = async (replacements) => {
    const query = `
        SELECT 
            u.id_usuario,
            u.nombre_completo as cliente,
            u.email,
            u.telefono,
            u.ciudad,
            COUNT(p.id_pedido) as total_pedidos,
            SUM(p.total) as total_gastado,
            AVG(p.total) as promedio_gasto
        FROM USUARIOS u
        INNER JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
        INNER JOIN ROLES r ON ru.id_rol = r.id_rol
        INNER JOIN PEDIDOS p ON u.id_usuario = p.id_usuario
        WHERE r.nombre = 'CLIENTE'
        AND p.estado != 'Cancelado'
        AND p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
        GROUP BY u.id_usuario, u.nombre_completo, u.email, u.telefono, u.ciudad
        HAVING total_pedidos > 0
        ORDER BY total_gastado DESC
        LIMIT 20
    `;

    const clientes = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    const totalQuery = `
        SELECT COUNT(DISTINCT id_usuario) as total
        FROM PEDIDOS
        WHERE fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
        AND estado != 'Cancelado'
    `;

    const [total] = await sequelize.query(totalQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    return {
        titulo: 'Reporte de Clientes',
        totalClientes: total?.total || 0,
        clientes
    };
};

const obtenerProductosMasVendidosSQL = async (replacements) => {
    const query = `
        SELECT 
            pr.id_producto,
            pr.nombre as producto,
            pr.marca,
            pr.precio,
            c.tipo_categoria as categoria,
            SUM(pp.cant_productos) as total_vendidos,
            SUM(pp.cant_productos * pr.precio) as ingreso_total
        FROM PEDIDOS_PRODUCTOS pp
        INNER JOIN PRODUCTOS pr ON pp.id_producto = pr.id_producto
        INNER JOIN CATEGORIAS c ON pr.id_categoria = c.id_categoria
        INNER JOIN PEDIDOS p ON pp.id_pedido = p.id_pedido
        WHERE p.estado != 'Cancelado'
        AND p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
        GROUP BY pr.id_producto, pr.nombre, pr.marca, pr.precio, c.tipo_categoria
        ORDER BY total_vendidos DESC
        LIMIT 10
    `;

    const productos = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    return { titulo: 'Productos Más Vendidos', productos };
};

const obtenerEstadoPedidosSQL = async (replacements) => {
    const query = `
        SELECT 
            estado,
            COUNT(*) as cantidad,
            SUM(total) as monto_total,
            AVG(total) as promedio
        FROM PEDIDOS
        WHERE fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
        GROUP BY estado
        ORDER BY 
            CASE estado
                WHEN 'Pendiente' THEN 1
                WHEN 'Abonado' THEN 2
                WHEN 'Listo' THEN 3
                WHEN 'Pagado' THEN 4
                WHEN 'En Proceso' THEN 5
                WHEN 'Enviado' THEN 6
                WHEN 'Entregado' THEN 7
                WHEN 'Cancelado' THEN 8
                ELSE 9
            END
    `;

    const detalle = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    const totales = detalle.reduce((acc, item) => {
        acc.total_pedidos += parseInt(item.cantidad);
        acc.monto_total += parseFloat(item.monto_total);
        return acc;
    }, { total_pedidos: 0, monto_total: 0 });

    return { titulo: 'Estado de Pedidos', resumen: totales, detalle };
};

const obtenerVentasCategoriaSQL = async (replacements) => {
    const query = `
        SELECT 
            c.tipo_categoria as categoria,
            COUNT(DISTINCT p.id_pedido) as pedidos,
            SUM(pp.cant_productos) as unidades_vendidas,
            SUM(pp.cant_productos * pr.precio) as ingresos
        FROM CATEGORIAS c
        INNER JOIN PRODUCTOS pr ON c.id_categoria = pr.id_categoria
        INNER JOIN PEDIDOS_PRODUCTOS pp ON pr.id_producto = pp.id_producto
        INNER JOIN PEDIDOS p ON pp.id_pedido = p.id_pedido
        WHERE p.estado != 'Cancelado'
        AND p.fecha_pedido BETWEEN :fecha_inicio AND :fecha_fin
        GROUP BY c.id_categoria, c.tipo_categoria
        ORDER BY ingresos DESC
    `;

    const detalle = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
    });

    const totales = detalle.reduce((acc, item) => {
        acc.total_unidades += parseInt(item.unidades_vendidas || 0);
        acc.total_ingresos += parseFloat(item.ingresos || 0);
        return acc;
    }, { total_unidades: 0, total_ingresos: 0 });

    return { titulo: 'Ventas por Categoría', resumen: totales, detalle };
};


const dibujarEncabezado = (doc, datos, periodo) => {
    // Banda roja superior
    doc.rect(0, 0, doc.page.width, 80).fill('#B90F0F');

    doc.fontSize(22)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .text('ÓPTICA BALAMB', 50, 25, { align: 'left' });

    doc.fontSize(10)
       .fillColor('#FFE5E5')
       .font('Helvetica')
       .text('Sistema de Reportes', 50, 52);

    // Título del reporte
    doc.fontSize(18)
       .fillColor('#333333')
       .font('Helvetica-Bold')
       .text(datos.titulo || 'Reporte', 50, 110, { align: 'center' });

    // Info del período
    doc.fontSize(9)
       .fillColor('#666666')
       .font('Helvetica')
       .text(`Generado: ${datos.fechaGeneracion}`, { align: 'right' })
       .text(`Período: ${periodo}`, { align: 'right' })
       .text(`Desde: ${datos.fechaInicio || 'N/A'}  |  Hasta: ${datos.fechaFin || 'N/A'}`, { align: 'right' })
       .moveDown(1.5);
};

const dibujarSeccion = (doc, titulo) => {
    if (doc.y > doc.page.height - 150) doc.addPage();

    doc.rect(50, doc.y, 5, 20).fill('#B90F0F');
    doc.fontSize(13)
       .fillColor('#B90F0F')
       .font('Helvetica-Bold')
       .text(titulo, 62, doc.y + 3)
       .moveDown(0.8);
    doc.font('Helvetica').fillColor('#333333');
};

const dibujarTarjetasResumen = (doc, items) => {
    const startX = 50;
    const startY = doc.y;
    const cardWidth = 155;
    const cardHeight = 60;
    const gap = 10;

    items.forEach((item, i) => {
        const x = startX + i * (cardWidth + gap);
        const y = startY;

        doc.roundedRect(x, y, cardWidth, cardHeight, 6)
           .fillAndStroke('#F8F9FA', '#DDDDDD');

        doc.fontSize(8)
           .fillColor('#888888')
           .font('Helvetica')
           .text(item.label.toUpperCase(), x + 10, y + 10, { width: cardWidth - 20 });

        doc.fontSize(14)
           .fillColor(item.color || '#B90F0F')
           .font('Helvetica-Bold')
           .text(String(item.valor), x + 10, y + 30, { width: cardWidth - 20 });
    });

    doc.y = startY + cardHeight + 20;
    doc.font('Helvetica').fillColor('#333333');
};

const dibujarTabla = (doc, columnas, filas) => {
    const startX = 50;
    let y = doc.y;
    const rowHeight = 22;
    const totalWidth = 500;
    const colWidths = columnas.map(c => c.width || totalWidth / columnas.length);

    // Encabezado
    doc.rect(startX, y, totalWidth, rowHeight).fill('#B90F0F');
    let x = startX;
    doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold');
    columnas.forEach((col, i) => {
        doc.text(col.label, x + 5, y + 6, { width: colWidths[i] - 10, align: col.align || 'left' });
        x += colWidths[i];
    });

    y += rowHeight;
    doc.font('Helvetica').fillColor('#333333').fontSize(9);

    // Filas
    filas.forEach((fila, idx) => {
        if (y > doc.page.height - 80) {
            doc.addPage();
            y = 60;
            doc.rect(startX, y, totalWidth, rowHeight).fill('#B90F0F');
            let hx = startX;
            doc.fontSize(9).fillColor('#FFFFFF').font('Helvetica-Bold');
            columnas.forEach((col, i) => {
                doc.text(col.label, hx + 5, y + 6, { width: colWidths[i] - 10, align: col.align || 'left' });
                hx += colWidths[i];
            });
            y += rowHeight;
            doc.font('Helvetica').fillColor('#333333').fontSize(9);
        }

        if (idx % 2 === 0) {
            doc.rect(startX, y, totalWidth, rowHeight).fill('#F8F9FA');
        }

        let cx = startX;
        columnas.forEach((col, i) => {
            const valor = fila[col.key] ?? '';
            doc.fillColor('#333333').text(String(valor), cx + 5, y + 6, {
                width: colWidths[i] - 10,
                align: col.align || 'left',
                ellipsis: true
            });
            cx += colWidths[i];
        });

        doc.strokeColor('#EEEEEE').lineWidth(0.5)
           .moveTo(startX, y + rowHeight)
           .lineTo(startX + totalWidth, y + rowHeight)
           .stroke();

        y += rowHeight;
    });

    doc.y = y + 15;
};

const dibujarGrafico = (doc, buffer, titulo) => {
    if (doc.y > doc.page.height - 300) doc.addPage();

    if (titulo) {
        doc.fontSize(10).fillColor('#666666').font('Helvetica-Bold')
           .text(titulo, { align: 'center' }).moveDown(0.3);
    }

    const imgWidth = 480;
    const imgHeight = 240;
    const x = (doc.page.width - imgWidth) / 2;

    doc.image(buffer, x, doc.y, { width: imgWidth, height: imgHeight });
    doc.y += imgHeight + 15;
    doc.font('Helvetica').fillColor('#333333');
};


const dibujarReportePDF = async (doc, datos, tipo, periodo) => {
    dibujarEncabezado(doc, datos, periodo);

    dibujarSeccion(doc, 'Resumen Ejecutivo');

    const tarjetas = [];
    if (tipo === 'ventas' && datos.resumen) {
        tarjetas.push(
            { label: 'Total Pedidos', valor: datos.resumen.total_pedidos || 0 },
            { label: 'Ventas Totales', valor: `$${Number(datos.resumen.ventas_totales || 0).toLocaleString('es-CO')}` },
            { label: 'Promedio', valor: `$${Number(datos.resumen.promedio_venta || 0).toLocaleString('es-CO')}` }
        );
    } else if (tipo === 'inventario') {
        tarjetas.push(
            { label: 'Productos', valor: datos.totalProductos || 0 },
            { label: 'Valor Inventario', valor: `$${Number(datos.valorTotal || 0).toLocaleString('es-CO')}` },
            { label: 'Categorías', valor: Object.keys(datos.porCategoria || {}).length }
        );
    } else if (tipo === 'repartidores') {
        tarjetas.push({ label: 'Repartidores', valor: datos.totalRepartidores || 0 });
    } else if (tipo === 'clientes') {
        tarjetas.push({ label: 'Clientes Activos', valor: datos.totalClientes || 0 });
    } else if (tipo === 'ventas-categoria' && datos.resumen) {
        tarjetas.push(
            { label: 'Unidades', valor: datos.resumen.total_unidades || 0 },
            { label: 'Ingresos', valor: `$${Number(datos.resumen.total_ingresos || 0).toLocaleString('es-CO')}` }
        );
    } else if (tipo === 'estado-pedidos' && datos.resumen) {
        tarjetas.push(
            { label: 'Total Pedidos', valor: datos.resumen.total_pedidos || 0 },
            { label: 'Monto Total', valor: `$${Number(datos.resumen.monto_total || 0).toLocaleString('es-CO')}` }
        );
    }

    if (tarjetas.length > 0) dibujarTarjetasResumen(doc, tarjetas);

    dibujarSeccion(doc, 'Análisis Visual');

    try {
        if (tipo === 'ventas' && datos.detalle?.length) {
            const top = datos.detalle.slice(0, 15).reverse();
            const buffer = await generarGraficoLineas({
                labels: top.map(d => new Date(d.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })),
                data: top.map(d => Number(d.ventas_totales || 0)),
                label: 'Ventas por día'
            });
            dibujarGrafico(doc, buffer, 'Evolución de ventas en el período');
        }
        else if (tipo === 'inventario' && datos.porCategoria) {
            const buffer = await generarGraficoDona({
                labels: Object.keys(datos.porCategoria),
                data: Object.values(datos.porCategoria).map(c => c.cantidad)
            });
            dibujarGrafico(doc, buffer, 'Distribución de productos por categoría');
        }
        else if (tipo === 'productos-mas-vendidos' && datos.productos?.length) {
            const buffer = await generarGraficoBarrasHorizontales({
                labels: datos.productos.map(p => p.producto?.substring(0, 25)),
                data: datos.productos.map(p => Number(p.total_vendidos || 0)),
                label: 'Unidades vendidas'
            });
            dibujarGrafico(doc, buffer, 'Top productos más vendidos');
        }
        else if (tipo === 'estado-pedidos' && datos.detalle?.length) {
            const buffer = await generarGraficoDona({
                labels: datos.detalle.map(d => d.estado),
                data: datos.detalle.map(d => Number(d.cantidad))
            });
            dibujarGrafico(doc, buffer, 'Distribución de pedidos por estado');
        }
        else if (tipo === 'ventas-categoria' && datos.detalle?.length) {
            const buffer = await generarGraficoBarras({
                labels: datos.detalle.map(d => d.categoria),
                data: datos.detalle.map(d => Number(d.ingresos || 0)),
                label: 'Ingresos ($)'
            });
            dibujarGrafico(doc, buffer, 'Ingresos por categoría');
        }
        else if (tipo === 'repartidores' && datos.repartidores?.length) {
            const buffer = await generarGraficoBarrasHorizontales({
                labels: datos.repartidores.map(r => r.repartidor),
                data: datos.repartidores.map(r => Number(r.pedidos_entregados || 0)),
                label: 'Entregas',
                color: '#06A77D'
            });
            dibujarGrafico(doc, buffer, 'Entregas por repartidor');
        }
        else if (tipo === 'clientes' && datos.clientes?.length) {
            const buffer = await generarGraficoBarrasHorizontales({
                labels: datos.clientes.map(c => c.cliente),
                data: datos.clientes.map(c => Number(c.total_gastado || 0)),
                label: 'Total gastado ($)',
                color: '#F77F00'
            });
            dibujarGrafico(doc, buffer, 'Top clientes por gasto');
        }
    } catch (err) {
        console.error('Error generando gráfico:', err);
        doc.fontSize(9).fillColor('#CC0000').text('(No se pudo generar el gráfico)').moveDown();
    }

    dibujarSeccion(doc, 'Detalle');

    if (tipo === 'ventas' && datos.detalle) {
        dibujarTabla(doc,
            [
                { label: 'Fecha', key: 'fecha', width: 100 },
                { label: 'Pedidos', key: 'total_pedidos', width: 80, align: 'center' },
                { label: 'Ventas', key: 'ventas_totales', width: 120, align: 'right' },
                { label: 'Promedio', key: 'promedio_venta', width: 120, align: 'right' },
                { label: 'Clientes', key: 'clientes_unicos', width: 80, align: 'center' }
            ],
            datos.detalle.slice(0, 20).map(d => ({
                fecha: new Date(d.fecha).toLocaleDateString('es-CO'),
                total_pedidos: d.total_pedidos,
                ventas_totales: `$${Number(d.ventas_totales || 0).toLocaleString('es-CO')}`,
                promedio_venta: `$${Number(d.promedio_venta || 0).toLocaleString('es-CO')}`,
                clientes_unicos: d.clientes_unicos
            }))
        );
    } else if (tipo === 'inventario' && datos.productos) {
        dibujarTabla(doc,
            [
                { label: 'Producto', key: 'nombre', width: 220 },
                { label: 'Marca', key: 'marca', width: 120 },
                { label: 'Categoría', key: 'tipo_categoria', width: 100 },
                { label: 'Precio', key: 'precio', width: 80, align: 'right' }
            ],
            datos.productos.slice(0, 20).map(p => ({
                ...p,
                precio: `$${Number(p.precio || 0).toLocaleString('es-CO')}`
            }))
        );
    } else if (tipo === 'repartidores' && datos.repartidores) {
        dibujarTabla(doc,
            [
                { label: 'Repartidor', key: 'repartidor', width: 160 },
                { label: 'Ciudad', key: 'ciudad', width: 100 },
                { label: 'Vehículo', key: 'tipo_vehiculo', width: 90 },
                { label: 'Asignados', key: 'pedidos_asignados', width: 70, align: 'center' },
                { label: 'Entregados', key: 'pedidos_entregados', width: 80, align: 'center' }
            ],
            datos.repartidores.map(r => ({
                repartidor: r.repartidor,
                ciudad: r.ciudad || 'N/A',
                tipo_vehiculo: r.tipo_vehiculo || 'N/A',
                pedidos_asignados: r.pedidos_asignados || 0,
                pedidos_entregados: r.pedidos_entregados || 0
            }))
        );
    } else if (tipo === 'clientes' && datos.clientes) {
        dibujarTabla(doc,
            [
                { label: '#', key: 'idx', width: 40, align: 'center' },
                { label: 'Cliente', key: 'cliente', width: 180 },
                { label: 'Ciudad', key: 'ciudad', width: 100 },
                { label: 'Pedidos', key: 'total_pedidos', width: 70, align: 'center' },
                { label: 'Total Gastado', key: 'total_gastado', width: 110, align: 'right' }
            ],
            datos.clientes.slice(0, 15).map((c, i) => ({
                idx: i + 1,
                cliente: c.cliente,
                ciudad: c.ciudad || 'N/A',
                total_pedidos: c.total_pedidos,
                total_gastado: `$${Number(c.total_gastado || 0).toLocaleString('es-CO')}`
            }))
        );
    } else if (tipo === 'productos-mas-vendidos' && datos.productos) {
        dibujarTabla(doc,
            [
                { label: '#', key: 'idx', width: 40, align: 'center' },
                { label: 'Producto', key: 'producto', width: 200 },
                { label: 'Marca', key: 'marca', width: 100 },
                { label: 'Vendidos', key: 'total_vendidos', width: 80, align: 'center' },
                { label: 'Ingresos', key: 'ingreso_total', width: 80, align: 'right' }
            ],
            datos.productos.map((p, i) => ({
                idx: i + 1,
                producto: p.producto,
                marca: p.marca || 'N/A',
                total_vendidos: p.total_vendidos,
                ingreso_total: `$${Number(p.ingreso_total || 0).toLocaleString('es-CO')}`
            }))
        );
    } else if (tipo === 'estado-pedidos' && datos.detalle) {
        dibujarTabla(doc,
            [
                { label: 'Estado', key: 'estado', width: 150 },
                { label: 'Cantidad', key: 'cantidad', width: 100, align: 'center' },
                { label: 'Monto Total', key: 'monto_total', width: 150, align: 'right' },
                { label: 'Promedio', key: 'promedio', width: 100, align: 'right' }
            ],
            datos.detalle.map(d => ({
                estado: d.estado,
                cantidad: d.cantidad,
                monto_total: `$${Number(d.monto_total || 0).toLocaleString('es-CO')}`,
                promedio: `$${Number(d.promedio || 0).toLocaleString('es-CO')}`
            }))
        );
    } else if (tipo === 'ventas-categoria' && datos.detalle) {
        dibujarTabla(doc,
            [
                { label: 'Categoría', key: 'categoria', width: 180 },
                { label: 'Pedidos', key: 'pedidos', width: 80, align: 'center' },
                { label: 'Unidades', key: 'unidades_vendidas', width: 90, align: 'center' },
                { label: 'Ingresos', key: 'ingresos', width: 150, align: 'right' }
            ],
            datos.detalle.map(d => ({
                categoria: d.categoria,
                pedidos: d.pedidos,
                unidades_vendidas: d.unidades_vendidas,
                ingresos: `$${Number(d.ingresos || 0).toLocaleString('es-CO')}`
            }))
        );
    }

    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
        doc.switchToPage(rango.start + i);
        doc.fontSize(8)
           .fillColor('#999999')
           .font('Helvetica')
           .text(
               `Óptica Balamb · Reporte generado automáticamente · Página ${i + 1} de ${rango.count}`,
               50,
               doc.page.height - 40,
               { align: 'center', width: doc.page.width - 100 }
           );
    }
};