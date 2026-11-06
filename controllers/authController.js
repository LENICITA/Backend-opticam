// controllers/authController.js
import { Usuario, Role, RolUsuario } from "../models/relaciones.js";
import sequelize from "../config/database.js";
import { generateToken } from "../utils/generadorToken.js";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { createTransport } from 'nodemailer';

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

const rollbackError = async (transaction, res, status, message) => {
    await transaction.rollback();
    return res.status(status).json({ success: false, message });
};

const errorSimple = (res, status, message) => {
    return res.status(status).json({ success: false, message });
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

const validarCamposOpcionales = ({ telefono, ciudad, email }) => {
    if (telefono && !validarTelefono(telefono)) {
        return { valido: false, mensaje: 'El teléfono debe empezar por 3 y tener 10 dígitos' };
    }
    if (ciudad && !validarCiudad(ciudad)) {
        return { valido: false, mensaje: 'La ciudad solo puede contener letras y espacios' };
    }
    if (email && !validarEmail(email)) {
        return { valido: false, mensaje: 'El email no tiene un formato válido' };
    }
    return { valido: true };
};

const verificarEmailDuplicado = async ({ email, transaction = null }) => {
    const emailLimpio = email.trim().toLowerCase();
    const existente = await Usuario.findOne({ where: { email: emailLimpio }, transaction });
    return existente ? { duplicado: true, emailLimpio } : { duplicado: false, emailLimpio };
};

const verificarDocumentoDuplicado = async ({ documento, transaction = null }) => {
    const existente = await Usuario.findOne({ where: { documento }, transaction });
    return !!existente;
};

const INCLUDE_ROLES = {
    model: Role,
    as: 'roles',
    through: { attributes: [] },
    attributes: ['nombre']
};

// LOGIN
export const login = async (req, res) => {
    try {
        const { email, contrasena } = req.body;

        if (!email || !contrasena) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridas'
            });
        }

        const emailLimpio = email.trim().toLowerCase();

const usuario = await Usuario.findOne({
    where: { email: emailLimpio },
    include: [INCLUDE_ROLES]
});

        if (!usuario) {
            return errorSimple(res, 401, 'Credenciales inválidas');
        }

        const isMatch = await usuario.comparePassword(contrasena);

        if (!isMatch) {
            return errorSimple(res, 401, 'Credenciales inválidas');
        }

        if (usuario.estado !== 'ACTIVO') {
            return errorSimple(res, 403, 'Usuario inactivo. Contacta al administrador.');
        }

         const { token } = generateToken(usuario.id_usuario);
        const roles = usuario.roles?.map(rol => rol.nombre) || [];

        res.json({
            success: true,
            message: 'Login exitoso',
            data: {
                usuario: {
                    id: usuario.id_usuario,
                    nombre_completo: usuario.nombre_completo,
                    email: usuario.email,
                    telefono: usuario.telefono,
                    ciudad: usuario.ciudad,
                    roles: roles
                },
                token
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// REGISTER
export const register = async (req, res) => {
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
            rol = 'CLIENTE'
        } = req.body;

        if (!nombre_completo || !email || !contrasena) {
            return rollbackError(transaction, res, 400, 'Nombre, email y contraseña son requeridos');
        }

        if (contrasena.length < 8) {
            return rollbackError(transaction, res, 400, 'La contraseña debe tener al menos 8 caracteres');
        }

        const validacion = validarCamposOpcionales({ telefono, ciudad, email });
        if (!validacion.valido) {
            return rollbackError(transaction, res, 400, validacion.mensaje);
        }

        if (documento) {
            const docValidacion = validarDocumento(documento);
            if (!docValidacion.valido) {
                return rollbackError(transaction, res, 400, docValidacion.msg);
            }
        }

        const { duplicado: emailDuplicado, emailLimpio } = await verificarEmailDuplicado({
            email, transaction
        });
        if (emailDuplicado) {
            return rollbackError(transaction, res, 409, 'El email ya está registrado');
        }

        if (documento) {
            const docDuplicado = await verificarDocumentoDuplicado({ documento, transaction });
            if (docDuplicado) {
                return rollbackError(transaction, res, 409, 'El documento ya está registrado');
            }
        }

        const usuario = await Usuario.create({
            nombre_completo,
            telefono: telefono || '',
            fecha_nacimiento: fecha_nacimiento || null,
            documento: documento || null,
            ciudad: ciudad || '',
            direccion: direccion || '',
            email: emailLimpio,
            contrasena,
            estado: 'ACTIVO'
        }, { transaction });

        const rolEncontrado = await Role.findOne({
            where: { nombre: rol.toUpperCase() },
            transaction
        });

        if (rolEncontrado) {
            await RolUsuario.create({
                id_usuario: usuario.id_usuario,
                id_rol: rolEncontrado.id_rol
            }, { transaction });
        } else {
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
        }

        await transaction.commit();

        const usuarioConRoles = await Usuario.findByPk(usuario.id_usuario, {
            include: [{
                model: Role,
                as: 'roles',
                through: { attributes: [] }
            }]
        });

        const roles = usuarioConRoles.roles?.map(r => r.nombre) || [];
        const { token } = generateToken(usuario.id_usuario);

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            data: {
                token,
                usuario: {
                    id: usuario.id_usuario,
                    nombre_completo: usuario.nombre_completo,
                    email: usuario.email,
                    telefono: usuario.telefono,
                    ciudad: usuario.ciudad,
                    roles: roles
                }
            }
        });

    } catch (error) {
        await transaction.rollback();
        return manejarErrorValidacion(error, res);
    }
};

// VERIFY TOKEN
export const verifyToken = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.user.id, {
            attributes: ['id_usuario', 'nombre_completo', 'email', 'telefono', 'ciudad', 'estado'],
            include: [INCLUDE_ROLES]   
        });

        if (!usuario) {
            return errorSimple(res, 404, 'Usuario no encontrado');
        }

        const roles = usuario.roles?.map(role => role.nombre) || [];

        res.json({
            success: true,
            data: {
                usuario: {
                    id: usuario.id_usuario,
                    nombre_completo: usuario.nombre_completo,
                    email: usuario.email,
                    telefono: usuario.telefono,
                    ciudad: usuario.ciudad,
                    estado: usuario.estado,
                    roles: roles
                }
            }
        });

    } catch (error) {
       return manejarErrorValidacion(error, res);
    }
};

// LOGOUT
export const logout = async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Sesión cerrada exitosamente'
        });
    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// RECUPERAR CONTRASEÑA - Solicitar reset
export const solicitarRecuperacion = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return errorSimple(res, 400, 'El email es requerido');
        }

        const validacion = validarCamposOpcionales({ email });
        if (!validacion.valido) {
            return errorSimple(res, 400, validacion.mensaje);
        }

        const emailLimpio = email.trim().toLowerCase();

const usuario = await Usuario.findOne({
    where: { email: emailLimpio }
});

        if (!usuario) {
             return errorSimple(res, 404, 'No existe una cuenta con este email');
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000);

        await usuario.update({
            reset_token: resetToken,
            reset_token_expiry: resetTokenExpiry
        });

        const resetLink = `http://192.168.0.7:5000/reset-password?token=${resetToken}`;

        // INTENTAR ENVIAR AL USUARIO PRIMERO

        let envioExitoso = false;
        let emailFalso = false;

        try {
            await enviarCorreoRecuperacion({
                emailDestino: usuario.email,
                nombre: usuario.nombre_completo,
                resetLink,
                emailOriginal: usuario.email,
                esFalso: false
            });
            envioExitoso = true;
        } catch (emailError) {
            
            // Verificar si es error de "usuario no existe"
            const reboto = emailError.message?.includes('550') ||
                           emailError.message?.includes('Recipient address rejected') ||
                           emailError.message?.includes('User unknown') ||
                           emailError.message?.includes('Invalid recipient');

            if (reboto) {
                emailFalso = true;
                
                // Enviar al admin
                await enviarCorreoRecuperacion({
                    emailDestino: process.env.CONTACT_EMAIL || 'opticampostman@gmail.com',
                    nombre: usuario.nombre_completo,
                    resetLink,
                    emailOriginal: usuario.email,
                    esFalso: true
                });
                envioExitoso = true;
            } else {
                // Otro tipo de error
                throw emailError;
            }
        }

        if (!envioExitoso) {
            return errorSimple(res, 500, 'Error al enviar el correo de recuperación');
        }

        res.json({
            success: true,
            message: emailFalso 
                ? 'El email no existe en la vida real. El enlace ha sido enviado al administrador.'
                : 'Se ha enviado un enlace de recuperación a tu correo'
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// ============================================
// FUNCIÓN: Enviar correo de recuperación
// ============================================
const enviarCorreoRecuperacion = async ({ emailDestino, nombre, resetLink, emailOriginal, esFalso }) => {
    const transporter = createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    let subject = '🔐 Recuperación de contraseña - Óptica Balamb';
    let html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #B90F0F;">🔐 Recuperación de contraseña</h2>
            <p>Hola <strong>${nombre}</strong>,</p>
            <p>Copia y pega el siguiente enlace en la app:</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace;">
                ${resetLink}
            </div>
            <p>Expira en 1 hora.</p>
        </div>
    `;

    if (esFalso) {
        subject = '⚠️ [ADMIN] Email no existe - Óptica Balamb';
        html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #B90F0F; border-radius: 8px;">
                <h2 style="color: #B90F0F;">⚠️ EL EMAIL NO EXISTE</h2>
                <p><strong>Usuario:</strong> ${nombre}</p>
                <p><strong>Email que intentó recuperar:</strong> ${emailOriginal}</p>
                <p>Enlace para restablecer:</p>
                <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; word-break: break-all; font-family: monospace;">
                    ${resetLink}
                </div>
            </div>
        `;
    }

    await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Óptica Balamb" <${process.env.SMTP_USER}>`,
        to: emailDestino,
        subject: subject,
        html: html,
    });
};


// RECUPERAR CONTRASEÑA - Verificar token
export const verificarTokenRecuperacion = async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return errorSimple(res, 400, 'Token requerido');
        }

        const usuario = await Usuario.findOne({
            where: {
                reset_token: token,
                reset_token_expiry: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!usuario) {
            return errorSimple(res, 400, 'Token inválido o expirado');
        }

        res.json({
            success: true,
            message: 'Token válido',
            data: {
                email: usuario.email,
                nombre_completo: usuario.nombre_completo
            }
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};

// RECUPERAR CONTRASEÑA - Resetear contraseña (VERSIÓN DEFINITIVA)
export const resetearPassword = async (req, res) => {
    try {
        const { token, nueva_contrasena } = req.body;

        if (!token || !nueva_contrasena) {
            return errorSimple(res, 400, 'Token y nueva contraseña son requeridos');
        }

        if (nueva_contrasena.length < 8) {
            return errorSimple(res, 400, 'La contraseña debe tener al menos 8 caracteres');
        }

        const usuario = await Usuario.findOne({
            where: {
                reset_token: token,
                reset_token_expiry: {
                    [Op.gt]: new Date()
                }
            }
        });

        if (!usuario) {
            return errorSimple(res, 400, 'Token inválido o expirado. Solicita un nuevo enlace.');
        }

        // GENERAR HASH
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nueva_contrasena, salt);

        // ACTUALIZAR USANDO UPDATE DIRECTO
        await Usuario.update(
            {
                contrasena: hashedPassword,
                reset_token: null,
                reset_token_expiry: null
            },
            {
                where: { id_usuario: usuario.id_usuario }
            }
        );

        // VERIFICAR QUE SE GUARDÓ CORRECTAMENTE
        const usuarioVerificado = await Usuario.findByPk(usuario.id_usuario);
        const testMatch = await usuarioVerificado.comparePassword(nueva_contrasena);

        if (!testMatch) {
            console.error('ERROR: La contraseña no se guardó correctamente');
            return errorSimple(res, 500, 'Error al guardar la contraseña. Intenta nuevamente.');
        }

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {
        return manejarErrorValidacion(error, res);
    }
};
