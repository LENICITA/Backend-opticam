import { 
    Usuario, 
    Vehiculo, 
    Role, 
    RolUsuario,
    Distribucion
} from "../models/relaciones.js";
import sequelize from "../config/database.js";
import { generateToken } from "../utils/generadorToken.js";
import { Op } from "sequelize";

// HELPER: Manejo centralizado de errores
const manejarErrorValidacion = (error, res) => {
    if (error.name === 'SequelizeValidationError') {
        const mensajes = error.errors.map(e => e.message);
        return res.status(400).json({
            success: false,
            message: mensajes[0],
            errores: mensajes
        });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
        const campo = error.errors[0]?.path || 'campo';
        const mensajes = {
            email: 'El email ya está registrado',
            documento: 'El documento ya está registrado',
            placa: 'La placa ya está registrada'
        };
        return res.status(400).json({
            success: false,
            message: mensajes[campo] || `El ${campo} ya está registrado`
        });
    }
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
            success: false,
            message: 'Referencia inválida en la base de datos'
        });
    }
    console.error('Error interno no controlado:', error);
    return res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
};

// VALIDADORES REUTILIZABLES
const REGEX_TELEFONO = /^3\d{9}$/;
const REGEX_CIUDAD = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const REGEX_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const validarTelefono = (telefono) => REGEX_TELEFONO.test(telefono);
const validarCiudad = (ciudad) => REGEX_CIUDAD.test(ciudad);

const validarEmail = (email) => {
  if (typeof email !== 'string') return false;
  const limpio = email.trim();
  if (limpio !== email) return false;
  if (/\s/.test(limpio)) return false;
  if (/\.\./.test(limpio)) return false;
  if (/^\./.test(limpio)) return false;
  if (/\.$/.test(limpio)) return false;
  if (/\.@/.test(limpio)) return false;
  if (/@\./.test(limpio)) return false;
  return REGEX_EMAIL.test(limpio);
};

// ============================
// VALIDADOR DE DOCUMENTO (BIGINT)
// ============================
const validarDocumento = (documento) => {
  const doc = String(documento).trim();

  if (!/^\d+$/.test(doc)) {
    return { valido: false, msg: "El documento debe contener solo números" };
  }
  if (doc.length < 6 || doc.length > 10) {
    return { valido: false, msg: "El documento debe tener entre 6 y 10 dígitos" };
  }
  if (/^0/.test(doc)) {
    return { valido: false, msg: "El documento no puede empezar por cero" };
  }
  if (/^(\d)\1+$/.test(doc)) {
    return { valido: false, msg: "El documento no puede tener todos los dígitos repetidos" };
  }
  if (esSecuencia(doc)) {
    return { valido: false, msg: "El documento no puede ser una secuencia numérica" };
  }
  return { valido: true };
};

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

// Registrar cliente
export const registrarCliente = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const {
            nombre_completo,
            telefono,
            fecha_nacimiento,
            documento,
            ciudad,
            direccion,
            email,
            contrasena
        } = req.body;

        // Validaciones
        if (!nombre_completo || !telefono || !fecha_nacimiento || !documento || !ciudad || !direccion || !email || !contrasena) {
            await transaction.rollback();
            return res.status(400).json({ 
                success: false, 
                message: "Todos los campos son requeridos" 
            });
        }

        if (!validarTelefono(telefono)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "El teléfono debe empezar por 3 y tener 10 dígitos"
            });
        }

        if (!validarCiudad(ciudad)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "La ciudad solo puede contener letras y espacios"
            });
        }

        if (!validarEmail(email)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "El email no tiene un formato válido"
            });
        }

        const docValidacion = validarDocumento(documento);
if (!docValidacion.valido) {
  await transaction.rollback();
  return res.status(400).json({ success: false, message: docValidacion.msg });
}

        if (contrasena.length < 8) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "La contraseña debe tener al menos 8 caracteres"
            });
        }

        // Verificar si el email ya existe
        const emailLimpio = email.trim().toLowerCase();

const emailExistente = await Usuario.findOne({
    where: { email: emailLimpio },
    transaction
});
        if (emailExistente) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "El email ya está registrado"
            });
        }

        // Verificar si el documento ya existe
        const documentoExistente = await Usuario.findOne({
            where: { documento },
            transaction
        });
        if (documentoExistente) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: "El documento ya está registrado"
            });
        }


        // Crear usuario
        const usuario = await Usuario.create({
            nombre_completo,
            telefono,
            fecha_nacimiento,
            documento,
            ciudad,
            direccion,
            email: emailLimpio,
            contrasena,
            estado: 'ACTIVO'
        }, { transaction });

        // Asignar rol de CLIENTE por defecto
        const rolCliente = await Role.findOne({
            where: { nombre: 'CLIENTE' },
            transaction
        });

        if (rolCliente) {
            await RolUsuario.create({
                id_usuario: usuario.id_usuario,
                id_rol: rolCliente.id_rol
            }, { transaction });
        }

        await transaction.commit();

        // Generar token
        const { token } = generateToken(usuario.id_usuario);

        res.status(201).json({
            success: true,
            message: 'Cliente registrado exitosamente',
            data: {
                usuario: {
                    id: usuario.id_usuario,
                    nombre_completo: usuario.nombre_completo,
                    email: usuario.email,
                    telefono: usuario.telefono,
                    ciudad: usuario.ciudad
                },
                token
            }
        });
    } catch (error) {
        await transaction.rollback();
        return manejarErrorValidacion(error, res);
    }
};

// Registrar repartidor desde el panel de admin
export const registrarRepartidor = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            nombre_completo,
            telefono,
            fecha_nacimiento,
            documento,
            ciudad,
            direccion,
            email,
            contrasena,
            vehiculo
        } = req.body;

        // Validaciones
        if (!nombre_completo || !telefono || !fecha_nacimiento || !documento || !ciudad || !direccion || !email || !contrasena || !vehiculo) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Todos los campos incluyendo el vehículo son requeridos'
            });
        }

        if (!vehiculo.tipo || !vehiculo.modelo || !vehiculo.placa || !vehiculo.color) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Los datos del vehículo (tipo, modelo, placa, color) son requeridos'
            });
        }

        if (!validarTelefono(telefono)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'El teléfono debe empezar por 3 y tener 10 dígitos'
            });
        }

        if (!validarCiudad(ciudad)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'La ciudad solo puede contener letras y espacios'
            });
        }

        if (!validarEmail(email)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'El email no tiene un formato válido'
            });
        }

        const docValidacion = validarDocumento(documento);
if (!docValidacion.valido) {
  await transaction.rollback();
  return res.status(400).json({ success: false, message: docValidacion.msg });
}

        if (contrasena.length < 8) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'La contraseña debe tener al menos 8 caracteres'
            });
        }

        if (!validarCiudad(vehiculo.color)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'El color del vehículo solo puede contener letras y espacios'
            });
        }

        // Verificar si el email ya existe
        const emailLimpio = email.trim().toLowerCase();

const emailExistente = await Usuario.findOne({
    where: { email: emailLimpio },
    transaction
});
        if (emailExistente) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'El email ya esta registrado'
            });
        }

        // Verificar si el documento ya existe
        const documentoExistente = await Usuario.findOne({
            where: { documento },
            transaction
        });

        if (documentoExistente) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'El documento ya esta registrado'
            });
        }

        const placaExistente = await Vehiculo.findOne({
            where: { placa: vehiculo.placa.toUpperCase() },
            transaction
        });
        if (placaExistente) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'La placa ya está registrada'
            });
        }

        // Crear usuario
        const usuario = await Usuario.create({
            nombre_completo,
            telefono,
            fecha_nacimiento,
            documento,
            ciudad,
            direccion,
            email: emailLimpio,
            contrasena,
            estado: 'ACTIVO'
        }, { transaction });

        // Asignar rol de repartidor
        const rolRepartidor = await Role.findOne({
            where: { nombre: 'REPARTIDOR' },
            transaction
        });

        if (!rolRepartidor) {
            await transaction.rollback();
            return res.status(500).json({
                success: false,
                message: 'Error: Rol REPARTIDOR no encontrado en la base de datos'
            });
        }
        await RolUsuario.create({
            id_usuario: usuario.id_usuario,
            id_rol: rolRepartidor.id_rol
        }, { transaction });

        // Crear vehiculo para el repartidor
        const vehiculoCreado = await Vehiculo.create({
            id_usuario: usuario.id_usuario,
            tipo: vehiculo.tipo,
            modelo: vehiculo.modelo,
            placa: vehiculo.placa.toUpperCase(),
            color: vehiculo.color
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Repartidor registrado exitosamente',
            data: {
                usuario: {
                    id: usuario.id_usuario,
                    nombre_completo: usuario.nombre_completo,
                    email: usuario.email,
                    telefono: usuario.telefono,
                    ciudad: usuario.ciudad
                },
                vehiculo: vehiculoCreado
            }
        });

    } catch (error) {
        await transaction.rollback();
        return manejarErrorValidacion(error, res);
    }
};

// Listar repartidores
export const listarRepartidores = async (req, res) => {
    try {
        const repartidores = await Usuario.findAll({
            include: [
                {
                    model: Role,
                    as: 'roles',
                    where: { nombre: 'REPARTIDOR' },
                    through: { attributes: [] }
                },
                {
                    model: Vehiculo,
                    as: 'vehiculo',
                    attributes: { exclude: ['id_usuario'] }
                }
            ],
            attributes: { exclude: ['contrasena'] },
            order: [['nombre_completo', 'ASC']]
        });

        res.json({
            success: true,
            data: repartidores
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// Obtener repartidor por ID
export const obtenerRepartidor = async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id, {
            attributes: { exclude: ['contrasena'] },
            include: [
                {
                    model: Role,
                    as: 'roles',
                    where: { nombre: 'REPARTIDOR' },
                    through: { attributes: [] }
                },
                {
                    model: Vehiculo,
                    as: 'vehiculo',
                    attributes: { exclude: ['id_usuario'] }
                }
            ]
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Repartidor no encontrado'
            });
        }

        const pedidosEntregados = await Distribucion.count({
            where: {
                id_usuario: id,
                estado: 'ENTREGADO' 
            }
        });

            const usuarioData = usuario.toJSON();
        usuarioData.pedidos_entregados = pedidosEntregados;
        usuarioData.pedidos_count = pedidosEntregados;

        res.json({
            success: true,
            data: usuarioData
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// Actualizar repartidor
export const actualizarRepartidor = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;
        const {
            nombre_completo,
            telefono,
            fecha_nacimiento,
            documento,
            ciudad,
            direccion,
            email,
            estado,
            vehiculo
        } = req.body;

        // Verificar que el usuario existe y es repartidor
        const usuario = await Usuario.findByPk(id, {
            include: [{
                model: Role,
                as: 'roles',
                where: { nombre: 'REPARTIDOR' }
            }],
            transaction
        });

        if (!usuario) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Repartidor no encontrado'
            });
        }

// Validar teléfono si viene
        if (telefono && !validarTelefono(telefono)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'El teléfono debe empezar por 3 y tener 10 dígitos'
            });
        }

        // Validar ciudad si viene
        if (ciudad && !validarCiudad(ciudad)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'La ciudad solo puede contener letras y espacios'
            });
        }

        // Validar email si viene
        if (email && !validarEmail(email)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'El email no tiene un formato válido'
            });
        }

        // Validar estado si viene
        if (estado && !['ACTIVO', 'INACTIVO', 'SUSPENDIDO'].includes(estado)) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Estado inválido. Debe ser: ACTIVO, INACTIVO o SUSPENDIDO'
            });
        }


 // Verificar documento duplicado
        if (documento) {
  // 1. Validar formato primero
  const docValidacion = validarDocumento(documento);
  if (!docValidacion.valido) {
    await transaction.rollback();
    return res.status(400).json({ success: false, message: docValidacion.msg });
  }
  // 2. Luego verificar duplicado
  if (documento !== usuario.documento) {
    const documentoExistente = await Usuario.findOne({
      where: { documento, id_usuario: { [Op.ne]: id } },
      transaction
    });
    if (documentoExistente) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'El documento ya está registrado por otro usuario'
      });
    }
  }
}

         // Verificar email duplicado
        const emailLimpio = email ? email.trim().toLowerCase() : email;

if (emailLimpio && emailLimpio !== usuario.email) {
    const emailExistente = await Usuario.findOne({
        where: {
            email: emailLimpio,
            id_usuario: { [Op.ne]: id }
        },
        transaction
    });
            if (emailExistente) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está registrado por otro usuario'
                });
            }
        }

        // Actualizar repartidor
        await usuario.update({
            nombre_completo: nombre_completo || usuario.nombre_completo,
            telefono: telefono || usuario.telefono,
            fecha_nacimiento: fecha_nacimiento || usuario.fecha_nacimiento,
            documento: documento || usuario.documento,
            ciudad: ciudad || usuario.ciudad,
            direccion: direccion || usuario.direccion,
            email: emailLimpio || usuario.email,
            estado: estado || usuario.estado
        }, { transaction });

        // Actualizar vehiculo si se proporciona
        if (vehiculo) {
            if (vehiculo.color && !validarCiudad(vehiculo.color)) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'El color del vehículo solo puede contener letras y espacios'
                });
            }

            let vehiculoExistente = await Vehiculo.findOne({
                where: { id_usuario: id },
                transaction
            });

            if (vehiculo.placa) {
                const placaExistente = await Vehiculo.findOne({
                    where: {
                        placa: vehiculo.placa.toUpperCase(),
                        id_usuario: { [Op.ne]: id }
                    },
                    transaction
                });
                if (placaExistente) {
                    await transaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: 'La placa ya está registrada por otro usuario'
                    });
                }
            }

            if (vehiculoExistente) {
                await vehiculoExistente.update({
                    tipo: vehiculo.tipo || vehiculoExistente.tipo,
                    modelo: vehiculo.modelo || vehiculoExistente.modelo,
                    placa: vehiculo.placa ? vehiculo.placa.toUpperCase() : vehiculoExistente.placa,
                    color: vehiculo.color || vehiculoExistente.color
                }, { transaction });
            } else {
                await Vehiculo.create({
                    id_usuario: id,
                    tipo: vehiculo.tipo,
                    modelo: vehiculo.modelo,
                    placa: vehiculo.placa.toUpperCase(),
                    color: vehiculo.color
                }, { transaction });
            }
        }

        await transaction.commit();

        // Obtener repartidor actualizado
        const repartidorActualizado = await Usuario.findByPk(id, {
            attributes: { exclude: ['contrasena'] },
            include: [
                {
                    model: Role,
                    as: 'roles',
                    through: { attributes: [] }
                },
                {
                    model: Vehiculo,
                    as: 'vehiculo',
                    attributes: { exclude: ['id_usuario'] }
                }
            ]
        });

        res.json({
            success: true,
            message: 'Repartidor actualizado exitosamente',
            data: repartidorActualizado
        });

    } catch (error) {
        await transaction.rollback();
        return manejarErrorValidacion(error, res);
    }
};

// Eliminar repartidor
export const eliminarRepartidor = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id, {
            include: [{
                model: Role,
                as: 'roles',
                where: { nombre: 'REPARTIDOR' }
            }]
        });

        if (!usuario) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Repartidor no encontrado'
            });
        }

        // Eliminar vehiculo asociado
        await Vehiculo.destroy({
            where: { id_usuario: id },
            transaction
        });

        // Eliminar registro en ROL_USUARIO
        await RolUsuario.destroy({
            where: { id_usuario: id },
            transaction
        });

        // Eliminar usuario
        await usuario.destroy({ transaction });

        await transaction.commit();

        res.json({
            success: true,
            message: 'Repartidor eliminado exitosamente'
        });

    } catch (error) {
        await transaction.rollback();
        return manejarErrorValidacion(error, res);
    }
};

// Cambiar estado del repartidor
export const cambiarEstadoRepartidor = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado || !['ACTIVO', 'INACTIVO', 'SUSPENDIDO'].includes(estado)) {
            return res.status(400).json({
                success: false,
                message: 'Estado invalido. Debe ser: ACTIVO, INACTIVO o SUSPENDIDO'
            });
        }

        const usuario = await Usuario.findByPk(id, {
            include: [{
                model: Role,
                as: 'roles',
                where: { nombre: 'REPARTIDOR' }
            }]
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Repartidor no encontrado'
            });
        }

        await usuario.update({ estado });

        res.json({
            success: true,
            message: `Estado del repartidor actualizado a ${estado}`,
            data: {
                id: usuario.id_usuario,
                nombre_completo: usuario.nombre_completo,
                estado: usuario.estado
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// Buscar repartidores con filtros
export const buscarRepartidores = async (req, res) => {
    try {
        const { nombre, ciudad, estado, placa } = req.query;

        // Construir filtros
        const whereConditions = {};
        if (nombre) whereConditions.nombre_completo = { [Op.like]: `%${nombre}%` };
        if (ciudad) whereConditions.ciudad = { [Op.like]: `%${ciudad}%` };
        if (estado) whereConditions.estado = estado;

        const includeVehiculo = {
            model: Vehiculo,
            as: 'vehiculo',
            attributes: { exclude: ['id_usuario'] }
        };

        if (placa) {
            includeVehiculo.where = { placa: { [Op.like]: `%${placa.toUpperCase()}%` } };
        }

        const repartidores = await Usuario.findAll({
            include: [
                {
                    model: Role,
                    as: 'roles',
                    where: { nombre: 'REPARTIDOR' },
                    through: { attributes: [] }
                },
                includeVehiculo
            ],
            where: whereConditions,
            attributes: { exclude: ['contrasena'] },
            order: [['nombre_completo', 'ASC']]
        });

        res.json({
            success: true,
            data: repartidores,
            total: repartidores.length
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// Obtener perfil del usuario autenticado
export const obtenerPerfil = async (req, res) => {
    try {
        const usuarioId = req.user.id;

        console.log(`Obteniendo perfil del usuario ${usuarioId}`);

        const usuario = await Usuario.findByPk(usuarioId, {
            attributes: { exclude: ['contrasena'] },
            include: [
                {
                    model: Role,
                    as: 'roles',
                    through: { attributes: [] },
                    attributes: ['nombre']
                },
                {
                    model: Vehiculo,
                    as: 'vehiculo',
                    attributes: { exclude: ['id_usuario'] }
                }
            ]
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: {
                id_usuario: usuario.id_usuario,
                nombre_completo: usuario.nombre_completo,
                email: usuario.email,
                telefono: usuario.telefono,
                direccion: usuario.direccion,
                ciudad: usuario.ciudad,
                documento: usuario.documento,
                fecha_nacimiento: usuario.fecha_nacimiento,
                estado: usuario.estado,
                roles: usuario.roles?.map(r => r.nombre) || [],
                vehiculo: usuario.vehiculo || null
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// Actualizar perfil del usuario autenticado
export const actualizarPerfil = async (req, res) => {
    try {
        const usuarioId = req.user.id;
        const { nombre_completo, telefono, direccion, ciudad, email, fecha_nacimiento, documento } = req.body;

        console.log(` Actualizando perfil del usuario ${usuarioId}`);

        const usuario = await Usuario.findByPk(usuarioId, {
            include: [{
                model: Role,
                as: 'roles',
                through: { attributes: [] },
                attributes: ['nombre']
            }]
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        const roles = usuario.roles?.map(r => r.nombre) || [];

        // REPARTIDOR NO PUEDE EDITAR SU PERFIL
        if (roles.includes('REPARTIDOR')) {
            return res.status(403).json({
                success: false,
                message: 'Los repartidores no pueden editar su perfil. Contacta al administrador.'
            });
        }

        if (telefono && !validarTelefono(telefono)) {
            return res.status(400).json({
                success: false,
                message: 'El teléfono debe empezar por 3 y tener 10 dígitos'
            });
        }

        if (ciudad && !validarCiudad(ciudad)) {
            return res.status(400).json({
                success: false,
                message: 'La ciudad solo puede contener letras y espacios'
            });
        }

        if (email && !validarEmail(email)) {
            return res.status(400).json({
                success: false,
                message: 'El email no tiene un formato válido'
            });
        }

        // Verificar si el email ya existe en otro usuario
        const emailLimpio = email ? email.trim().toLowerCase() : email;

if (emailLimpio && emailLimpio !== usuario.email) {
    const emailExistente = await Usuario.findOne({
        where: {
            email: emailLimpio,
            id_usuario: { [Op.ne]: usuarioId }
        }
    });
            if (emailExistente) {
                return res.status(400).json({
                    success: false,
                    message: 'El email ya está registrado por otro usuario'
                });
            }
        }
        // Verificar si el documento ya existe en otro usuario
if (documento) {
  // 1. Validar formato primero
  const docValidacion = validarDocumento(documento);
  if (!docValidacion.valido) {
    return res.status(400).json({ success: false, message: docValidacion.msg });
  }
  // 2. Luego verificar duplicado
  if (documento !== usuario.documento) {
    const documentoExistente = await Usuario.findOne({
      where: { documento, id_usuario: { [Op.ne]: usuarioId } }
    });
    if (documentoExistente) {
      return res.status(400).json({
        success: false,
        message: 'El documento ya está registrado por otro usuario'
      });
    }
  }
}

        // Actualizar solo los campos permitidos
        await usuario.update({
            nombre_completo: nombre_completo || usuario.nombre_completo,
            telefono: telefono || usuario.telefono,
            direccion: direccion !== undefined ? direccion : usuario.direccion,
            ciudad: ciudad || usuario.ciudad,
            email: emailLimpio || usuario.email,
            fecha_nacimiento: fecha_nacimiento || usuario.fecha_nacimiento,
            documento: documento || usuario.documento
        });

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente',
            data: {
                id_usuario: usuario.id_usuario,
                nombre_completo: usuario.nombre_completo,
                email: usuario.email,
                telefono: usuario.telefono,
                direccion: usuario.direccion,
                ciudad: usuario.ciudad,
                fecha_nacimiento: usuario.fecha_nacimiento,  
                documento: usuario.documento
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};
export const contarClientes = async (req, res) => {
    try {
        const count = await Usuario.count({
            include: [{
                model: Role,
                as: 'roles',
                where: { nombre: 'CLIENTE' }
            }]
        });

        res.json({
            success: true,
            data: { total: count }
        });
    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};
