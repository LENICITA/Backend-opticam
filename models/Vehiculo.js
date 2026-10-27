import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Vehiculo = sequelize.define('Vehiculo', {
  id_vehiculo: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'USUARIOS',
      key: 'id_usuario'
    }
  },
  tipo: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notEmpty: { msg: "El tipo de vehículo es requerido" },
      isIn: {
        args: [['CARRO', 'MOTO', 'Carro', 'Moto']],
        msg: "El tipo de vehículo debe ser CARRO o MOTO"
      }
    }
  },
  modelo: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notEmpty: { msg: "El modelo del vehículo es requerido" },
      len: { args: [2, 45], msg: "El modelo debe tener entre 2 y 45 caracteres" }
    }
  },
  placa: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: { msg: "La placa ya está registrada" },
    validate: {
      notEmpty: { msg: "La placa es requerida" },
      len: { args: [5, 10], msg: "La placa debe tener entre 5 y 10 caracteres" }
    }
  },
  color: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notEmpty: { msg: "El color del vehículo es requerido" },
      is: {
        args: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
        msg: "El color solo puede contener letras y espacios"
      }
    }
  }
}, {
  tableName: 'VEHICULOS',
  timestamps: false
});

export default Vehiculo;