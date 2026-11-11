import { 
    Usuario, 
    Vehiculo, 
    Role, 
    RolUsuario,
    Distribucion
} from "../models/relaciones.js";
import manejarErrorValidacion from '../utils/manejarErrores.js';
import { rollbackError, errorSimple } from '../utils/respuestas.js';
import {
  validarTelefono,
  validarCiudad,
  validarEmail,
  validarDocumento,
  validarCamposOpcionales
} from '../utils/validadores.js';
import sequelize from "../config/database.js";
import { generateToken } from "../utils/generadorToken.js";
import { Op } from "sequelize";

const validarCamposRegistro = ({ nombre_completo, telefono, fecha_nacimiento, documento, ciudad, direccion, email, contrasena }) => {
  if (!nombre_completo || !telefono || !fecha_nacimiento || !documento || !ciudad || !direccion || !email || !contrasena) {
    return { valido: false, mensaje: 'Todos los campos son requeridos' };
  }
  if (!validarTelefono(telefono)) {
    return { valido: false, mensaje: 'El teléfono debe empezar por 3 y tener 10 dígitos' };
  }
  if (!validarCiudad(ciudad)) {
    return { valido: false, mensaje: 'La ciudad solo puede contener letras y espacios' };
  }
  if (!validarEmail(email)) {
    return { valido: false, mensaje: 'El email no tiene un formato válido' };
  }
  const docValidacion = validarDocumento(documento);
  if (!docValidacion.valido) {
    return { valido: false, mensaje: docValidacion.msg };
  }
  if (contrasena.length < 8) {
    return { valido: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' };
  }
  return { valido: true };
};

const verificarEmailDuplicado = async ({ email, idExcluir = null, transaction }) => {
  const emailLimpio = email.trim().toLowerCase();
  const where = { email: emailLimpio };
  if (idExcluir !== null) where.id_usuario = { [Op.ne]: idExcluir };

  const existente = await Usuario.findOne({ where, transaction });
  return existente ? { duplicado: true, emailLimpio } : { duplicado: false, emailLimpio };
};

const verificarDocumentoDuplicado = async ({ documento, idExcluir = null, transaction }) => {
  const where = { documento };
  if (idExcluir !== null) where.id_usuario = { [Op.ne]: idExcluir };

  const existente = await Usuario.findOne({ where, transaction });
  return !!existente;
};

const INCLUDE_REPARTIDOR = [
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
];

const INCLUDE_PERFIL = [
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
];

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
        const validacion = validarCamposRegistro({
            nombre_completo, telefono, fecha_nacimiento,
            documento, ciudad, direccion, email, contrasena
        });
        if (!validacion.valido) {
            return rollbackError(transaction, res, 400, validacion.mensaje);
        }

        const { duplicado: emailDuplicado, emailLimpio } = await verificarEmailDuplicado({
            email, transaction
        });
        if (emailDuplicado) {
            return rollbackError(transaction, res, 400, 'El email ya está registrado');
        }

        const docDuplicado = await verificarDocumentoDuplicado({ documento, transaction });
        if (docDuplicado) {
            return rollbackError(transaction, res, 400, 'El documento ya está registrado');
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
         const validacion = validarCamposRegistro({
            nombre_completo, telefono, fecha_nacimiento,
            documento, ciudad, direccion, email, contrasena
        });
        if (!validacion.valido) {
            return rollbackError(transaction, res, 400, validacion.mensaje);
        }

        if (!vehiculo) {
            return rollbackError(transaction, res, 400, 'Todos los campos incluyendo el vehículo son requeridos');
        }

        if (!vehiculo.tipo || !vehiculo.modelo || !vehiculo.placa || !vehiculo.color) {
            return rollbackError(transaction, res, 400, 'Los datos del vehículo (tipo, modelo, placa, color) son requeridos');
        }

        if (!validarCiudad(vehiculo.color)) {
            return rollbackError(transaction, res, 400, 'El color del vehículo solo puede contener letras y espacios');
        }

        const { duplicado: emailDuplicado, emailLimpio } = await verificarEmailDuplicado({
            email, transaction
        });
        if (emailDuplicado) {
            return rollbackError(transaction, res, 400, 'El email ya esta registrado');
        }

        const docDuplicado = await verificarDocumentoDuplicado({ documento, transaction });
        if (docDuplicado) {
            return rollbackError(transaction, res, 400, 'El documento ya esta registrado');
        }

        const placaExistente = await Vehiculo.findOne({
            where: { placa: vehiculo.placa.toUpperCase() },
            transaction
        });
        if (placaExistente) {
            return rollbackError(transaction, res, 400, 'La placa ya está registrada');
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
            return rollbackError(transaction, res, 500, 'Error: Rol REPARTIDOR no encontrado en la base de datos');
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
            include: INCLUDE_REPARTIDOR,  
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
            include: INCLUDE_REPARTIDOR
        });

        if (!usuario) {
            return errorSimple(res, 404, 'Repartidor no encontrado');
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
            return rollbackError(transaction, res, 404, 'Repartidor no encontrado');
        }

        const validacion = validarCamposOpcionales({ telefono, ciudad, email });
        if (!validacion.valido) {
            return rollbackError(transaction, res, 400, validacion.mensaje);
        }

        // Validar estado si viene
        if (estado && !['ACTIVO', 'INACTIVO', 'SUSPENDIDO'].includes(estado)) {
            return rollbackError(transaction, res, 400, 'Estado inválido. Debe ser: ACTIVO, INACTIVO o SUSPENDIDO');
        }


 // Verificar documento duplicado
        if (documento) {
            const docValidacion = validarDocumento(documento);
            if (!docValidacion.valido) {
                return rollbackError(transaction, res, 400, docValidacion.msg);
            }
            if (documento !== usuario.documento) {
                const docDuplicado = await verificarDocumentoDuplicado({
                    documento, idExcluir: id, transaction
                });
                if (docDuplicado) {
                    return rollbackError(transaction, res, 400, 'El documento ya está registrado por otro usuario');
                }
            }
        }

         // Verificar email duplicado
        let emailLimpio = email ? email.trim().toLowerCase() : email;
        if (emailLimpio && emailLimpio !== usuario.email) {
            const { duplicado } = await verificarEmailDuplicado({
                email, idExcluir: id, transaction
            });
            if (duplicado) {
                return rollbackError(transaction, res, 400, 'El email ya está registrado por otro usuario');
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
                return rollbackError(transaction, res, 400, 'El color del vehículo solo puede contener letras y espacios');
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
                    return rollbackError(transaction, res, 400, 'La placa ya está registrada por otro usuario');
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
            include: INCLUDE_PERFIL
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
            return rollbackError(transaction, res, 404, 'Repartidor no encontrado');
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
            return errorSimple(res, 400, 'Estado invalido. Debe ser: ACTIVO, INACTIVO o SUSPENDIDO');
        }

        const usuario = await Usuario.findByPk(id, {
            include: [{
                model: Role,
                as: 'roles',
                where: { nombre: 'REPARTIDOR' }
            }]
        });

        if (!usuario) {
            return errorSimple(res, 404, 'Repartidor no encontrado');
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

        const usuario = await Usuario.findByPk(usuarioId, {
            attributes: { exclude: ['contrasena'] },
            include: INCLUDE_PERFIL 
        });

        if (!usuario) {
            return errorSimple(res, 404, 'Usuario no encontrado');
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

        const usuario = await Usuario.findByPk(usuarioId, {
            include: [{
                model: Role,
                as: 'roles',
                through: { attributes: [] },
                attributes: ['nombre']
            }]
        });

        if (!usuario) {
            return errorSimple(res, 404, 'Usuario no encontrado');
        }

        const roles = usuario.roles?.map(r => r.nombre) || [];

        // REPARTIDOR NO PUEDE EDITAR SU PERFIL
        if (roles.includes('REPARTIDOR')) {
            return errorSimple(res, 403, 'Los repartidores no pueden editar su perfil. Contacta al administrador.');
        }

        const validacion = validarCamposOpcionales({ telefono, ciudad, email });
        if (!validacion.valido) {
            return errorSimple(res, 400, validacion.mensaje);
        }

        // Verificar si el email ya existe en otro usuario
        const emailLimpio = email ? email.trim().toLowerCase() : email;
        if (emailLimpio && emailLimpio !== usuario.email) {
            const { duplicado } = await verificarEmailDuplicado({
                email, idExcluir: usuarioId
            });
            if (duplicado) {
                return errorSimple(res, 400, 'El email ya está registrado por otro usuario');
            }
        }

        // Verificar si el documento ya existe en otro usuario
        if (documento) {
            const docValidacion = validarDocumento(documento);
            if (!docValidacion.valido) {
                return errorSimple(res, 400, docValidacion.msg);
            }
            if (documento !== usuario.documento) {
                const docDuplicado = await verificarDocumentoDuplicado({
                    documento, idExcluir: usuarioId
                });
                if (docDuplicado) {
                    return errorSimple(res, 400, 'El documento ya está registrado por otro usuario');
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
