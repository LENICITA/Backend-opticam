import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

// MODELO DISTRIBUCIONES
const Distribucion = sequelize.define('Distribucion', {
  id_distribucion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_pedido: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PEDIDOS',
      key: 'id_pedido'
    },
    validate: {
      notNull: { msg: 'El pedido es requerido' },
      isInt:   { msg: 'El ID del pedido debe ser un número' }
    }
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'USUARIOS',
      key: 'id_usuario'
    },
    validate: {
      notNull: { msg: 'El repartidor es requerido' },
      isInt:   { msg: 'El ID del repartidor debe ser un número' }
    }
  },
  estado: {
    type: DataTypes.ENUM('PENDIENTE', 'EN_ENTREGA', 'ENTREGADO', 'CANCELADO'),
    allowNull: false,
    defaultValue: 'PENDIENTE',
    validate: {
      notNull: { msg: 'El estado es requerido' },
      notEmpty: { msg: 'El estado es requerido' },
      isIn: {
        args: [['PENDIENTE', 'EN_ENTREGA', 'ENTREGADO', 'CANCELADO']],
        msg: 'Estado inválido. Debe ser: PENDIENTE, EN_ENTREGA, ENTREGADO o CANCELADO'
      }
    }
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  fecha_entrega: {
    type: DataTypes.DATE,
    allowNull: true
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    validate: {
      len: {
        args: [0, 5000],
        msg: 'Las observaciones no pueden superar los 5000 caracteres'
      }
    }
  }
}, {
  tableName: 'DISTRIBUCIONES',
  timestamps: false,
  hooks: {
    beforeCreate: (distribucion) => {
      if (distribucion.estado) {
        distribucion.estado = distribucion.estado.toUpperCase();
      }
    },
    beforeUpdate: (distribucion) => {
      if (distribucion.changed('estado') && distribucion.estado) {
        distribucion.estado = distribucion.estado.toUpperCase();
      }
      if (distribucion.estado === 'ENTREGADO' && !distribucion.fecha_entrega) {
        distribucion.fecha_entrega = new Date();
      }
    }
  }
});

// MÉTODOS DEL MODELO
const DistribucionModelo = {

  // Crear una nueva distribución (admin asigna pedido a repartidor)
  crear: async (data) => {
    const distribucion = await Distribucion.create({
      id_pedido: data.id_pedido,
      id_usuario: data.id_usuario,
      estado: 'PENDIENTE',
      observaciones: data.observaciones || null
    });
    return distribucion;
  },

  // Obtener distribución por ID (con datos del pedido)
  obtenerPorId: async (id_distribucion) => {
    const distribucion = await Distribucion.findByPk(id_distribucion, {
      include: [
        {
          model: sequelize.models.Pedido,
          as: 'pedido',
          attributes: ['id_pedido', 'id_usuario', 'direccion_entrega', 'ciudad_envio', 'total', 'fecha_estimada']
        },
        {
          model: sequelize.models.Usuario,
          as: 'repartidor',
          attributes: ['id_usuario', 'nombre_completo', 'email', 'telefono']
        }
      ]
    });
    return distribucion;
  },

  // Obtener todas las distribuciones (admin)
  obtenerTodas: async () => {
  const distribuciones = await sequelize.query(
    `SELECT d.*, 
            p.id_pedido, p.direccion_entrega, p.ciudad_envio, p.total, p.fecha_estimada,
            u.nombre_completo as cliente_nombre,
            r.nombre_completo as repartidor_nombre,
            v.tipo as vehiculo_tipo, v.placa as vehiculo_placa
     FROM DISTRIBUCIONES d
     LEFT JOIN PEDIDOS p ON d.id_pedido = p.id_pedido
     LEFT JOIN USUARIOS u ON p.id_usuario = u.id_usuario
     LEFT JOIN USUARIOS r ON d.id_usuario = r.id_usuario
     LEFT JOIN VEHICULOS v ON r.id_usuario = v.id_usuario
     ORDER BY d.fecha_asignacion DESC`,
    { type: sequelize.QueryTypes.SELECT }
  );
  return distribuciones;
},


  //Obtener distribuciones de un usuario específico (admin o repartidor)
  obtenerPorUsuario: async (id_usuario) => {
    const distribuciones = await Distribucion.findAll({
      where: { id_usuario },
      include: [
        {
          model: sequelize.models.Pedido,
          as: 'pedido',
          attributes: ['id_pedido', 'direccion_entrega', 'ciudad_envio', 'total', 'fecha_estimada', 'id_usuario']
        }
      ],
      order: [['fecha_asignacion', 'DESC']]
    });
    return distribuciones;
  },


  // Obtener distribuciones pendientes de un repartidor (con dirección del pedido)
  obtenerPendientes: async (id_usuario) => {
    try {
      console.log(`Buscando pedidos pendientes para repartidor ${id_usuario}`);
    
      const distribuciones = await Distribucion.findAll({
        where: {
          id_usuario,
          estado: 'PENDIENTE'
        },
        include: [
          {
            model: sequelize.models.Pedido,
            as: 'pedido',
            attributes: ['id_pedido', 'id_usuario', 'direccion_entrega', 'ciudad_envio','total', 'fecha_estimada']
          }
        ],
        order: [['fecha_asignacion', 'ASC']]
      });
    
      console.log(`${distribuciones.length} pedidos pendientes encontrados`);
      return distribuciones;
    
    } catch (error) {
      console.error('Error en obtenerPendientes:', error);
      throw error;
    }
  },


  // Obtener distribuciones en entrega de un repartidor (con dirección del pedido)
  obtenerEnEntrega: async (id_usuario) => {
    try {
      console.log(`Buscando pedidos en entrega para repartidor ${id_usuario}`);
    
      const distribuciones = await Distribucion.findAll({
        where: {
          id_usuario,
          estado: 'EN_ENTREGA'
        },
        include: [
          {
            model: sequelize.models.Pedido,
            as: 'pedido',
            attributes: ['id_pedido', 'id_usuario', 'direccion_entrega', 'ciudad_envio','total', 'fecha_estimada']
          }
        ],
        order: [['fecha_asignacion', 'DESC']]
      });
    
      console.log(`${distribuciones.length} pedidos en entrega encontrados`);
      return distribuciones;
    
    } catch (error) {
      console.error('Error en obtenerEnEntrega:', error);
      throw error;
    }
  },


  // Obtener historial de entregas de un repartidor (con dirección del pedido)
  obtenerHistorial: async (id_usuario) => {
    const distribuciones = await Distribucion.findAll({
      where: {
        id_usuario,
        estado: 'ENTREGADO'
      },
      include: [
        {
          model: sequelize.models.Pedido,
          as: 'pedido',
          attributes: ['id_pedido', 'id_usuario', 'direccion_entrega', 'ciudad_envio','total', 'fecha_estimada']
        }
      ],
      order: [['fecha_entrega', 'DESC']]
    });
    return distribuciones;
  },


  // Iniciar entrega (repartidor)
  iniciarEntrega: async (id_distribucion) => {
    const distribucion = await Distribucion.findByPk(id_distribucion);
    if (!distribucion) return null;
    
    if (distribucion.estado !== 'PENDIENTE') {
      throw new Error(`No se puede iniciar una entrega en estado ${distribucion.estado}`);
    }
    
    await distribucion.update({ estado: 'EN_ENTREGA' });
    return distribucion;
  },

  // Marcar como entregado (repartidor) y actualizar estado del pedido

  marcarEntregado: async (id_distribucion) => {
    const distribucion = await Distribucion.findByPk(id_distribucion);
    if (!distribucion) return null;
    
    if (distribucion.estado !== 'EN_ENTREGA') {
      throw new Error(`No se puede marcar como entregado en estado ${distribucion.estado}`);
    }
    
    await distribucion.update({
      estado: 'ENTREGADO',
      fecha_entrega: new Date()
    });
    
    // Actualizar estado del pedido a 'Entregado'
    await sequelize.query(
      'UPDATE PEDIDOS SET estado = "Entregado" WHERE id_pedido = ?',
      { replacements: [distribucion.id_pedido] }
    );
    
    return distribucion;
  },

  // Cancelar entrega (admin)
  cancelarEntrega: async (id_distribucion, observacion) => {
    const distribucion = await Distribucion.findByPk(id_distribucion);
    if (!distribucion) return null;

    if (distribucion.estado !== 'PENDIENTE') {
      throw new Error(
        `Solo se pueden cancelar distribuciones en estado PENDIENTE. Estado actual: ${distribucion.estado}`
      );
    }
    
    await distribucion.update({
      estado: 'CANCELADO',
      observaciones: observacion || 'Cancelado por administrador'
    });
    
    // Actualizar estado del pedido a 'Pagado'
    await sequelize.query(
      'UPDATE PEDIDOS SET estado = "Pagado" WHERE id_pedido = ?',
      { replacements: [distribucion.id_pedido] }
    );
    
    return distribucion;
  },


  // Verificar si un pedido ya tiene distribución activa
  pedidoTieneDistribucionActiva: async (id_pedido) => {
    const distribucion = await Distribucion.findOne({
      where: {
        id_pedido,
        estado: {
          [Op.in]: ['PENDIENTE', 'EN_ENTREGA']
        }
      }
    });
    return !!distribucion;
  }
};

export { Distribucion }; 
export default DistribucionModelo; 