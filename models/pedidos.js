import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// MODELO PEDIDOS
const Pedido = sequelize.define('Pedido', {
  id_pedido: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'USUARIOS',
      key: 'id_usuario',
    },
    validate: {
      notNull: { msg: 'El usuario es requerido' },
      isInt:   { msg: 'El ID del usuario debe ser un número' }
    }
  },
  id_formula: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'FORMULAS',
      key: 'id_formula'
    }
  },
  fecha_pedido: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fecha_estimada: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notNull:  { msg: 'La fecha estimada es requerida' },
      notEmpty: { msg: 'La fecha estimada es requerida' },
      isDate:   { msg: 'La fecha estimada no es válida' }
    }
  },
  direccion_entrega: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notNull:  { msg: 'La dirección de entrega es requerida' },
      notEmpty: { msg: 'La dirección de entrega es requerida' },
      len: { args: [5, 45], msg: 'La dirección debe tener entre 5 y 45 caracteres' }
    }
  },
  ciudad_envio: {  
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notNull:  { msg: 'La ciudad de envío es requerida' },
      notEmpty: { msg: 'La ciudad de envío es requerida' },
      is: {
        args: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
        msg: 'La ciudad solo puede contener letras y espacios'
      }
    }
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Abonado', 'Listo', 'Pagado', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado'),
    allowNull: false,
    defaultValue: 'Pendiente',
    validate: {
      isIn: {
        args: [['Pendiente', 'Abonado', 'Listo', 'Pagado', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado']],
        msg: 'Estado inválido'
      }
    }
  },
  costo_envio: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'El costo de envío no puede ser negativo' }
    }
  },
  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      notNull: { msg: 'El total es requerido' },
      isFloat: { msg: 'El total debe ser un número' },
      min: { args: [0.01], msg: 'El total debe ser mayor a 0' }
    }
  }
}, {
  tableName: 'PEDIDOS',
  timestamps: false
});

// MÉTODOS DEL MODELO
const PedidoModelo = {

  // CLIENTE

  /**
   * Crear un nuevo pedido
   */
  crear: async (data) => {
    console.log('Datos recibidos en crear:', data);
    console.log('fecha_estimada recibida:', data.fecha_estimada);

    // Asegurar que fecha_estimada esté definida
    if (!data.fecha_estimada) {
      throw new Error('fecha_estimada es requerida');
    }

    const pedido = await Pedido.create({
      id_usuario: data.id_usuario,
      id_formula: data.id_formula || null,
      direccion_entrega: data.direccion_entrega,
      ciudad_envio: data.ciudad_envio,
      estado: 'Pendiente',
      costo_envio: data.costo_envio || 0,
      total: data.total,
      fecha_estimada: data.fecha_estimada
    });
    console.log('Pedido creado:', pedido.id_pedido);
    return pedido.id_pedido;
  },

  /**
   * Obtener pedidos de un cliente específico
   */
  obtenerPorCliente: async (id_usuario) => {
    const pedidos = await sequelize.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM PEDIDOS_PRODUCTOS pp WHERE pp.id_pedido = p.id_pedido) as total_productos
      FROM PEDIDOS p
      WHERE p.id_usuario = ?
      ORDER BY p.fecha_pedido DESC`,
      { replacements: [id_usuario], type: sequelize.QueryTypes.SELECT }
    );
    return pedidos;
  },

  /**
   * Obtener pedido por ID (incluye datos del usuario y fórmula)
   */
  obtenerPorId: async (id_pedido) => {
    const [pedido] = await sequelize.query(
      `SELECT p.*, u.nombre_completo, u.email, u.telefono, u.direccion, u.ciudad,
              f.id_formula, f.condicion, f.imagen_formula, f.observaciones, f.costo as costo_formula
       FROM PEDIDOS p
       JOIN USUARIOS u ON p.id_usuario = u.id_usuario
       LEFT JOIN FORMULAS f ON p.id_formula = f.id_formula
       WHERE p.id_pedido = ?`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    return pedido;
  },

  // ADMIN

  /**
   * Obtener todos los pedidos con datos del cliente y fórmula
   */
  obtenerTodos: async () => {
    const pedidos = await sequelize.query(
      `SELECT p.*, u.nombre_completo as cliente, u.email, u.telefono, u.ciudad,
              f.id_formula, f.condicion, f.imagen_formula, f.observaciones, f.costo as costo_formula, r.nombre_completo as repartidor_nombre
       FROM PEDIDOS p
       JOIN USUARIOS u ON p.id_usuario = u.id_usuario
       LEFT JOIN FORMULAS f ON p.id_formula = f.id_formula
       LEFT JOIN DISTRIBUCIONES d ON p.id_pedido = d.id_pedido AND d.estado IN ('PENDIENTE', 'EN_ENTREGA') 
       LEFT JOIN USUARIOS r ON d.id_usuario = r.id_usuario
       WHERE p.estado NOT IN ('Pendiente', 'Cancelado')
       ORDER BY p.fecha_pedido DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return pedidos;
  },

  /**
   * Obtener pedidos por estado
   */
  obtenerPorEstado: async (estado) => {
    const pedidos = await Pedido.findAll({
      where: { estado },
      order: [['fecha_pedido', 'DESC']]
    });
    return pedidos;
  },

  /**
   * Actualizar estado del pedido
   */
  actualizarEstado: async (id_pedido, estado) => {
    const pedido = await Pedido.findByPk(id_pedido);
    if (!pedido) return false;
    await pedido.update({ estado });
    return true;
  },

  /**
   * Actualizar fecha estimada de entrega
   */
  actualizarFechaEstimada: async (id_pedido, fecha_estimada) => {
    const pedido = await Pedido.findByPk(id_pedido);
    if (!pedido) return false;
    await pedido.update({ fecha_estimada });
    return true;
  },

  // UTILIDADES

  /**
   * Verificar si el pedido pertenece al usuario
   */
  perteneceAUsuario: async (id_pedido, id_usuario) => {
    const pedido = await Pedido.findOne({
      where: {
        id_pedido,
        id_usuario
      }
    });
    return !!pedido;
  },

  /**
   * Recalcular fecha estimada de entrega (8-10 días)
   */
  recalcularFechaEstimada: async (id_pedido) => {
    const pedido = await Pedido.findByPk(id_pedido);
    if (!pedido) return false;
    
    const fechaPedido = new Date(pedido.fecha_pedido);
    const dias = 8 + Math.floor(Math.random() * 3);
    const fechaEstimada = new Date(fechaPedido);
    fechaEstimada.setDate(fechaPedido.getDate() + dias);
    
    await pedido.update({
      fecha_estimada: fechaEstimada.toISOString().split('T')[0]
    });
    return true;
  },

  /**
   * Obtener estadísticas de pedidos para admin
   */
  obtenerEstadisticas: async () => {
    const [stats] = await sequelize.query(
      `SELECT 
        COUNT(*) as total_pedidos,
        SUM(CASE WHEN estado = 'Abonado' THEN 1 ELSE 0 END) as abonados,
        SUM(CASE WHEN estado = 'Listo' THEN 1 ELSE 0 END) as listos,
        SUM(CASE WHEN estado = 'Pagado' THEN 1 ELSE 0 END) as pagados,
        SUM(CASE WHEN estado = 'En Proceso' THEN 1 ELSE 0 END) as en_proceso,
        SUM(CASE WHEN estado = 'Enviado' THEN 1 ELSE 0 END) as enviados,
        SUM(CASE WHEN estado = 'Entregado' THEN 1 ELSE 0 END) as entregados,
        SUM(total) as ingresos_totales,
        AVG(total) as promedio_venta
       FROM PEDIDOS
       WHERE estado NOT IN ('Pendiente', 'Cancelado')`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return stats;
  }
};

export { Pedido };
export default PedidoModelo;