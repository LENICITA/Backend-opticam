import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Formulas = sequelize.define('Formulas', {
  id_formula: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'USUARIOS',
      key: 'id_usuario'
    },
    validate: {
      notNull: { msg: 'El usuario es requerido' },
      isInt:   { msg: 'El ID del usuario debe ser un número' }
    }
  },
  condicion: {
    type: DataTypes.ENUM('DALTONISMO', 'ASTIGMATISMO', 'MIOPIA', 'BAJA VISION'),
    allowNull: false,
    validate: {
      notNull: { msg: 'La condición es requerida' },
      notEmpty: { msg: 'La condición es requerida' },
      isIn: {
        args: [['DALTONISMO', 'ASTIGMATISMO', 'MIOPIA', 'BAJA VISION']],
        msg: 'Condición inválida. Debe ser: DALTONISMO, ASTIGMATISMO, MIOPIA o BAJA VISION'
      }
    }
  },
  imagen_formula: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notNull: { msg: 'La imagen de la fórmula es requerida' },
      notEmpty: { msg: 'La imagen de la fórmula es requerida' }
    }
  },
  observaciones: {
    type: DataTypes.STRING(200),
    allowNull: true,
    validate: {
      len: {
        args: [0, 200],
        msg: 'Las observaciones no pueden superar los 200 caracteres'
      }
    }
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  costo: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: {
        args: [0],
        msg: 'El costo no puede ser negativo'
      }
    }
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Aprobado', 'Rechazado'),
    allowNull: false,
    defaultValue: 'Pendiente',
    validate: {
      isIn: {
        args: [['Pendiente', 'Aprobado', 'Rechazado']],
        msg: 'Estado inválido. Debe ser: Pendiente, Aprobado o Rechazado'
      }
    }
  }
}, {
  tableName: 'FORMULAS',
  timestamps: false,
  hooks: {
    // Normalizar condicion a MAYÚSCULAS antes de crear
    beforeCreate: (formula) => {
      if (formula.condicion) {
        formula.condicion = formula.condicion.toUpperCase();
      }
    },
    // Normalizar condicion a MAYÚSCULAS antes de actualizar
    beforeUpdate: (formula) => {
      if (formula.changed('condicion') && formula.condicion) {
        formula.condicion = formula.condicion.toUpperCase();
      }
    }
  }
});

// ========== MÉTODOS DEL MODELO ==========
const Formula = {

  // CLIENTE

  // Crear una nueva fórmula (cliente sube)
  crear: async (data) => {
    const formula = await Formulas.create({
      id_usuario: data.id_usuario,
      condicion: data.condicion,
      imagen_formula: data.imagen_formula,
      observaciones: data.observaciones || null,
      estado: 'Pendiente'
    });
    return formula.id_formula;
  },
  

  eliminar: async (id_formula) => {
    const formula = await Formulas.findByPk(id_formula);
    if (!formula) return false;
    
    await formula.destroy();
    return true;
  },

  // Obtener fórmulas de un cliente específico
  obtenerPorCliente: async (id_usuario) => {
    const formulas = await Formulas.findAll({
      where: { id_usuario },
      order: [['fecha_creacion', 'DESC']]
    });
    return formulas;
  },

  // Obtener fórmula por ID (cliente ve su fórmula)
  obtenerPorId: async (id_formula) => {
    const formula = await Formulas.findByPk(id_formula);
    return formula;
  },

  // ADMIN

  // Obtener todas las fórmulas (admin ve todas)
  obtenerTodas: async () => {
    const formulas = await sequelize.query(
      `SELECT f.*, u.nombre_completo, u.email, u.telefono
       FROM FORMULAS f
       JOIN USUARIOS u ON f.id_usuario = u.id_usuario
       ORDER BY f.fecha_creacion DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return formulas;
  },

  // Obtener fórmulas pendientes (admin ve solo pendientes)
  obtenerPendientes: async () => {
    const formulas = await sequelize.query(
      `SELECT f.*, u.nombre_completo, u.email, u.telefono
       FROM FORMULAS f
       JOIN USUARIOS u ON f.id_usuario = u.id_usuario
       WHERE f.estado = 'Pendiente'
       ORDER BY f.fecha_creacion ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return formulas;
  },

  // Asignar precio a una fórmula (admin)
  asignarPrecio: async (id_formula, costo, estado) => {
    const formula = await Formulas.findByPk(id_formula);
    if (!formula) return false;

    await formula.update({
      costo: costo,
      estado: estado || 'Aprobado'
    });
    return true;
  },

  // Cambiar estado de una fórmula (admin)
  cambiarEstado: async (id_formula, estado) => {
    const formula = await Formulas.findByPk(id_formula);
    if (!formula) return false;

    await formula.update({ estado });
    return true;
  },

  // UTILIDADES

  // Verificar si una fórmula pertenece a un usuario
  perteneceAUsuario: async (id_formula, id_usuario) => {
    const formula = await Formulas.findOne({
      where: {
        id_formula,
        id_usuario
      }
    });
    return !!formula;
  },

  // Verificar si una fórmula está aprobada
  estaAprobada: async (id_formula) => {
    const formula = await Formulas.findByPk(id_formula);
    if (!formula) return false;
    return formula.estado === 'Aprobado';
  },

  // Obtener fórmulas por estado
  obtenerPorEstado: async (estado) => {
    const formulas = await Formulas.findAll({
      where: { estado },
      order: [['fecha_creacion', 'DESC']]
    });
    return formulas;
  }
};

export { Formulas };

export default Formula;