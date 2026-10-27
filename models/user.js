import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

// VALIDADOR DE DOCUMENTO (BIGINT, máx 10 dígitos)
function validarDocumento(valor) {
  if (valor === null || valor === undefined) return;

  const doc = String(valor).trim();

  // Solo dígitos
  if (!/^\d+$/.test(doc)) {
    throw new Error("El documento debe contener solo números");
  }
  // Entre 6 y 10 dígitos
  if (doc.length < 6 || doc.length > 10) {
    throw new Error("El documento debe tener entre 6 y 10 dígitos");
  }
  // No puede empezar por 0  (con BIGINT el cero inicial se pierde igual)
  // Si quisieras permitir UN solo cero inicial, cambia por: /^0{2,}/
  if (/^0/.test(doc)) {
    throw new Error("El documento no puede empezar por cero");
  }
  // Todos los dígitos iguales: 1111111111, 9999999999...
  if (/^(\d)\1+$/.test(doc)) {
    throw new Error("El documento no puede tener todos los dígitos repetidos");
  }
  // Secuencias: 1234567890, 9876543210
  if (esSecuencia(doc)) {
    throw new Error("El documento no puede ser una secuencia numérica");
  }
}

function esSecuencia(valor) {
  if (valor.length < 6) return false;
  let ascendente = true;
  let descendente = true;
  for (let i = 1; i < valor.length; i++) {
    const diff = valor.charCodeAt(i) - valor.charCodeAt(i - 1);
    if (diff !== 1) ascendente = false;
    if (diff !== -1) descendente = false;
  }
  return ascendente || descendente;
}

// tabla de USUARIOS en BD
const Usuario = sequelize.define('Usuario', {
  id_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_completo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: "EL nombre completo es requerido" },
      notNull:  { msg: "El nombre completo es requerido" },
      len: { args: [3, 100], msg: "El nombre debe ser entre 3 y 100 caracteres" }
    }
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: "El telefono es requerido" },
      notNull: { msg: "El telefono es requerido" },
      is: {
        args: /^3\d{9}$/,
        msg: "El teléfono debe empezar por 3 y tener 10 dígitos"
      }
    }
  },
  fecha_nacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notEmpty: { msg: "La fecha de nacimiento es requerida" },
      notNull:  { msg: "La fecha de nacimiento es requerida" },
      isDate:   { msg: "La fecha de nacimiento no es válida" }
    }
  },
  documento: {
    type: DataTypes.BIGINT(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: "EL documento es requerido" },
      notNull:  { msg: "El documento es requerido" },
      isInt:    { msg: "El documento debe contener solo números" },
      esDocumentoValido(value) {
      validarDocumento(value); 
    }
    }
  },
  ciudad: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: "La ciudad es requerida" },
      notNull:  { msg: "La ciudad es requerida" },
      is: {
        args: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
        msg: "La ciudad solo puede contener letras y espacios"
      }
    }
  },
  direccion: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notEmpty: { msg: "La direccion es requerida" },
      notNull: { msg: "La dirección es requerida" }
    }
  },
  fecha_registro: {
    type: DataTypes.DATE,    
    defaultValue: DataTypes.NOW
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: "El email es requerido" },
      notNull:  { msg: "El email es requerido" },
      isEmail: { msg: "El email no tiene un formato válido"},
      esEmailEstricto(value) {
        if (!value) return;
        if (/\s/.test(value)) {
          throw new Error("El email no puede contener espacios");
        }
        if (/\.\./.test(value)) {
          throw new Error("El email no puede tener puntos dobles");
        }
        if (/^\./.test(value) || /\.$/.test(value)) {
          throw new Error("El email no puede empezar ni terminar con punto");
        }
        if (/\.@|@\./.test(value)) {
          throw new Error("El email tiene un punto mal ubicado");
        }
      }
    }
  },
  contrasena: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: "La contraseña es requerida" },
      notNull:  { msg: "La contraseña es requerida" },
      len: { args: [8, 255], msg: "La contraseña debe tener al menos 8 caracteres" }
    }
  },
  estado: {
    type: DataTypes.STRING(45),
    defaultValue: 'ACTIVO',
    validate: {
      isIn: { args: [['ACTIVO', 'INACTIVO', 'SUSPENDIDO']], msg: "Estado invalido"}
    }
  },
  reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reset_token_expiry: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'USUARIOS',
  timestamps: false,
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.contrasena) {
        const salt = await bcrypt.genSalt(10);
        usuario.contrasena = await bcrypt.hash(usuario.contrasena, salt);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('contrasena')) {
        const contrasena = usuario.getDataValue('contrasena');
        // Solo hashear si NO es un hash de bcrypt
        if (!contrasena.startsWith('$2a$') && !contrasena.startsWith('$2b$') && !contrasena.startsWith('$2y$')) {
          const salt = await bcrypt.genSalt(10);
          usuario.contrasena = await bcrypt.hash(contrasena, salt);
        }
      }
    }
  }
});

// Método para comparar contraseñas
Usuario.prototype.comparePassword = async function (candidatePassword) {
  if (!this.contrasena) return false;
  return await bcrypt.compare(candidatePassword, this.contrasena);  
};

// Método estático para autenticar
Usuario.authenticate = async function (email, contrasena) {
  const user = await this.findOne({ where: { email }});
  if (!user) throw new Error("Usuario no encontrado");
  const isMatch = await user.comparePassword(contrasena);
  if (!isMatch) throw new Error("Contraseña incorrecta");
  return user;
};

export default Usuario;
