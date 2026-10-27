import { Usuario, Role } from '../models/relaciones.js';

export const adminMiddleware = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado'
            });
        }

        const usuario = await Usuario.findByPk(req.user.id, {
            include: [{
                model: Role,
                as: 'roles',
                through: { attributes: [] }
            }]
        });

        if (!usuario) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado'
            });
        }

        // Verificar si tiene rol ADMIN
        const esAdmin = usuario.roles?.some(role => role.nombre === 'ADMIN') || false;

        if (!esAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Acceso denegado. Se requieren permisos de administrador'
            });
        }

        console.log('Admin autorizado:', usuario.nombre_completo);
        next();

    } catch (error) {
        console.error('Error en admin middleware: ', error);
        return res.status(500).json({
            success: false,
            message: 'Error al verificar permisos de administrador'
        });
    }
};