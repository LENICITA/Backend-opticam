import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

// MODELO PAGOS
const Pago = sequelize.define('Pago', {
  id_pago: {
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
  fecha_pago: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  eleccion_pago: {
    type: DataTypes.ENUM('50%', '100%'),
    allowNull: false,
     validate: {
      notNull: { msg: 'La elección de pago es requerida' },
      isIn: {
        args: [['50%', '100%']],
        msg: 'La elección debe ser 50% o 100%'
      }
    }
  },
  canal_pago: {
    type: DataTypes.ENUM('Bold'),
    allowNull: false,
    defaultValue: 'Bold',
    validate: {
      isIn: {
        args: [['Bold']],
        msg: 'El canal de pago debe ser Bold'
      }
    }
  },
  monto: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      notNull: { msg: 'El monto es requerido' },
      isFloat: { msg: 'El monto debe ser un número válido' },
      min: {
        args: [0.01],
        msg: 'El monto debe ser mayor a 0'
      }
    }
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Confirmado', 'Rechazado'),
    allowNull: false,
    defaultValue: 'Pendiente',
    validate: {
      isIn: {
        args: [['Pendiente', 'Confirmado', 'Rechazado']],
        msg: 'Estado inválido. Debe ser: Pendiente, Confirmado o Rechazado'
      }
    }
  },
  bold_reference: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'Referencia LNK_xxx que devuelve Bold al crear el link'
  },
  bold_payment_id: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'ID del pago que Bold envía en el webhook (PAY_xxx)'
  },
  bold_link: {
    type: DataTypes.STRING(300),
    allowNull: true,
    comment: 'URL completa de Bold a la que redirigir al cliente'
  }
}, {
  tableName: 'PAGOS',
  timestamps: false
});

// MÉTODOS DEL MODELO
const PagoModel = {

  // ========== CLIENTE ==========

  /**
   * Crear un nuevo pago
   */
  crear: async (data) => {
    const pago = await Pago.create({
      id_pedido: data.id_pedido,
      eleccion_pago: data.eleccion_pago,
      canal_pago: data.canal_pago || 'Bold',
      monto: data.monto,
      estado: 'Pendiente',
      bold_reference: data.bold_reference || null,
      bold_payment_id: data.bold_payment_id || null,
      bold_link: data.bold_link || null
    });
    return pago.id_pago;
  },

  /**
   * Obtener pagos de un pedido
   */
  obtenerPorPedido: async (id_pedido) => {
    const pagos = await Pago.findAll({
      where: { id_pedido },
      order: [['fecha_pago', 'DESC']]
    });
    return pagos;
  },

  /**
   * Obtener pago por ID
   */
  obtenerPorId: async (id_pago) => {
    const pago = await Pago.findByPk(id_pago);
    return pago;
  },

  // ========== BOLD (WEBHOOKS) ==========

  /**
   * Bold confirma el pago
   * - Si es 100% → pedido a Pagado
   * - Si es 50% y es el primer pago → pedido a Abonado
   * - Si es 50% y ya tiene abono previo → pedido a Pagado (saldo restante)
   * - Siempre verificar si el total pagado >= total del pedido
   */
  confirmarPago: async (id_pago) => {
    const pago = await Pago.findByPk(id_pago);
    if (!pago) return false;
    
    // Actualizar estado del pago
    await pago.update({ estado: 'Confirmado' });

    // Obtener el pedido para saber su total
    const [pedido] = await sequelize.query(
      'SELECT id_pedido, total, estado FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [pago.id_pedido], type: sequelize.QueryTypes.SELECT }
    );

    if (!pedido) return false;

    // Obtener el total pagado actual
    const totalPagado = await PagoModel.obtenerTotalPagado(pago.id_pedido);

    // Verificar si el pedido ya está completamente pagado
    if (totalPagado >= pedido.total) {
      await sequelize.query(
        'UPDATE PEDIDOS SET estado = "Pagado" WHERE id_pedido = ?',
        { replacements: [pago.id_pedido] }
      );
      return true;
    }

    // Si no está completamente pagado, determinar el estado según el tipo de pago
    if (pago.eleccion_pago === '100%') {
      if (pago.monto >= pedido.total) {
        await sequelize.query(
          'UPDATE PEDIDOS SET estado = "Pagado" WHERE id_pedido = ?',
          { replacements: [pago.id_pedido] }
        );
      }
    } else if (pago.eleccion_pago === '50%') {
      // Verificar si ya tiene un abono del 50% previo (excluyendo el pago actual)
      const [abonosPrevios] = await sequelize.query(
        `SELECT * FROM PAGOS 
         WHERE id_pedido = ? 
         AND estado = 'Confirmado' 
         AND eleccion_pago = '50%'
         AND id_pago != ?`,
        { replacements: [pago.id_pedido, pago.id_pago] }
      );
      
      const tieneAbonoPrevio = abonosPrevios && abonosPrevios.length > 0;

      if (tieneAbonoPrevio) {
        // Si ya tenía un abono y este es el segundo pago del 50%
        // Verificar si ya se completó el pago
        if (totalPagado >= pedido.total) {
          await sequelize.query(
            'UPDATE PEDIDOS SET estado = "Pagado" WHERE id_pedido = ?',
            { replacements: [pago.id_pedido] }
          );
        } else {
          await sequelize.query(
            'UPDATE PEDIDOS SET estado = "Abonado" WHERE id_pedido = ?',
            { replacements: [pago.id_pedido] }
          );
        }
      } else {
        // Primer pago del 50% (abono inicial) → Abonado
        await sequelize.query(
          'UPDATE PEDIDOS SET estado = "Abonado" WHERE id_pedido = ?',
          { replacements: [pago.id_pedido] }
        );
      }
    }
    return true;
  },

  /**
   * Bold rechaza el pago
   */
  rechazarPago: async (id_pago) => {
    const pago = await Pago.findByPk(id_pago);
    if (!pago) return false;
    await pago.update({ estado: 'Rechazado' });
    return true;
  },

  // ========== UTILIDADES ==========

  /**
   * Obtener total pagado de un pedido (suma de todos los pagos confirmados)
   */
  obtenerTotalPagado: async (id_pedido) => {
    const [result] = await sequelize.query(
      `SELECT COALESCE(SUM(monto), 0) as total_pagado 
       FROM PAGOS 
       WHERE id_pedido = ? AND estado = 'Confirmado'`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    return parseFloat(result?.total_pagado) || 0;
  },

  /**
   * Verificar si el pedido tiene un pago completo (100%)
   */
  tienePagoCompleto: async (id_pedido) => {
    const [pago] = await sequelize.query(
      `SELECT * FROM PAGOS 
       WHERE id_pedido = ? AND estado = 'Confirmado' AND eleccion_pago = '100%'`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    return !!pago;
  },

  /**
   * Verificar si el pedido tiene un abono del 50%
   */
  tieneAbono50: async (id_pedido) => {
    const [pago] = await sequelize.query(
      `SELECT * FROM PAGOS 
       WHERE id_pedido = ? AND estado = 'Confirmado' AND eleccion_pago = '50%'`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    return !!pago;
  },

  /**
   * Verificar si el pedido tiene pago completo por suma de abonos
   */
  tienePagoCompletoPorSuma: async (id_pedido) => {
    const [pedido] = await sequelize.query(
      'SELECT total FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );
    if (!pedido) return false;

    const totalPagado = await PagoModel.obtenerTotalPagado(id_pedido);
    return totalPagado >= pedido.total;
  },

  /**
   * Verificar si el pedido tiene un abono del 50% previo (excluyendo un pago específico)
   */
  tieneAbono50Previo: async (id_pedido, id_pagoExcluir) => {
    const [abonos] = await sequelize.query(
      `SELECT * FROM PAGOS 
       WHERE id_pedido = ? 
       AND estado = 'Confirmado' 
       AND eleccion_pago = '50%'
       AND id_pago != ?`,
      { replacements: [id_pedido, id_pagoExcluir] }
    );
    return abonos && abonos.length > 0;
  }
};

export { Pago };
export default PagoModel;