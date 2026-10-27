import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PedidoProducto = sequelize.define('PedidoProducto', {
  id_pedido: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'PEDIDOS',
      key: 'id_pedido'
    },
    validate: {
      notNull: { msg: 'El pedido es requerido' },
      isInt:   { msg: 'El ID del pedido debe ser un número' }
    }
  },
  id_producto: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'PRODUCTOS',
      key: 'id_producto'
    },
    validate: {
      notNull: { msg: 'El producto es requerido' },
      isInt:   { msg: 'El ID del producto debe ser un número' }
    }
  },
  cant_productos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'La cantidad es requerida' },  
      isInt:   { msg: 'La cantidad debe ser un número entero' }, 
      min: {
        args: [1],
        msg: 'La cantidad debe ser mayor a 0'
      }
    }
  }
}, {
  tableName: 'PEDIDOS_PRODUCTOS',
  timestamps: false
});

// ========== MÉTODOS DEL MODELO ==========
const PedidoProductoModelo  = {

  // Agregar un producto al pedido
  agregar: async (data) => {
    const pedidoProducto = await PedidoProducto.create({
      id_pedido: data.id_pedido,
      id_producto: data.id_producto,
      cant_productos: data.cantidad
    });
    return pedidoProducto;
  },

  // Agregar múltiples productos al pedido
  agregarMultiples: async (id_pedido, productos) => {
    const items = productos.map(p => ({
      id_pedido,
      id_producto: p.id_producto,
      cant_productos: p.cantidad
    }));
    await PedidoProducto.bulkCreate(items);
    return items;
  },

  // Obtener productos de un pedido
  obtenerPorPedido: async (id_pedido) => {
    const productos = await sequelize.query(
      `SELECT pp.cant_productos, pr.*, c.tipo_categoria
       FROM PEDIDOS_PRODUCTOS pp
       JOIN PRODUCTOS pr ON pp.id_producto = pr.id_producto
       JOIN CATEGORIAS c ON pr.id_categoria = c.id_categoria
       WHERE pp.id_pedido = ?`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    return productos;
  },

  // Eliminar productos de un pedido
  eliminarPorPedido: async (id_pedido) => {
    await PedidoProducto.destroy({
      where: { id_pedido }
    });
    return true;
  },

  // Obtener subtotal de un pedido
  obtenerSubtotal: async (id_pedido) => {
    const [result] = await sequelize.query(
      `SELECT SUM(pp.cant_productos * pr.precio) as subtotal
       FROM PEDIDOS_PRODUCTOS pp
       JOIN PRODUCTOS pr ON pp.id_producto = pr.id_producto
       WHERE pp.id_pedido = ?`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    return parseFloat(result?.subtotal) || 0;
  },

  // Verificar si un producto está en un pedido
  existeProductoEnPedido: async (id_pedido, id_producto) => {
    const pedidoProducto = await PedidoProducto.findOne({
      where: {
        id_pedido,
        id_producto
      }
    });
    return !!pedidoProducto;
  },

  // Actualizar cantidad de un producto en un pedido
  actualizarCantidad: async (id_pedido, id_producto, cantidad) => {
    const pedidoProducto = await PedidoProducto.findOne({
      where: {
        id_pedido,
        id_producto
      }
    });
    if (!pedidoProducto) return false;
    await pedidoProducto.update({ cant_productos: cantidad });
    return true;
  },

  // Eliminar un producto específico de un pedido
  eliminarProducto: async (id_pedido, id_producto) => {
    const pedidoProducto = await PedidoProducto.destroy({
      where: {
        id_pedido,
        id_producto
      }
    });
    return pedidoProducto > 0;
  },

  // Obtener total de productos en un pedido
  contarProductos: async (id_pedido) => {
    const [result] = await sequelize.query(
      `SELECT SUM(cant_productos) as total_items
       FROM PEDIDOS_PRODUCTOS
       WHERE id_pedido = ?`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    return parseInt(result?.total_items) || 0;
  }
};

export { PedidoProducto }; 
export default PedidoProductoModelo;