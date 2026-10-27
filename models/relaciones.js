import Usuario from './user.js';
import Vehiculo from './Vehiculo.js';
import Role from './Role.js';
import RolUsuario from './RolUsuario.js';
import { Pedido } from './pedidos.js';
import { Distribucion } from './Distribucion.js'; 
import { Formulas } from './formula.js';

// Relación entre Usuario y Role (Many-to-Many)
Usuario.belongsToMany(Role, {
    through: RolUsuario,
    foreignKey: 'id_usuario',
    otherKey: 'id_rol',
    as: 'roles'
});

Role.belongsToMany(Usuario, {
    through: RolUsuario,
    foreignKey: 'id_rol',
    otherKey: 'id_usuario',
    as: 'usuarios'
});

// Relación entre RolUsuario y Usuario
RolUsuario.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario'
});

Usuario.hasMany(RolUsuario, {
    foreignKey: 'id_usuario',
    as: 'rolUsuarios'
});

// Relación entre RolUsuario y Role
RolUsuario.belongsTo(Role, {
    foreignKey: 'id_rol',
    as: 'rol'
});

Role.hasMany(RolUsuario, {
    foreignKey: 'id_rol',
    as: 'rolUsuarios'
});

// Relación entre Usuario y Vehiculo (One-to-One)
Usuario.hasOne(Vehiculo, {
    foreignKey: 'id_usuario',
    as: 'vehiculo',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Vehiculo.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario'
});

// Usuario -> Distribucion
Usuario.hasMany(Distribucion, {
    foreignKey: 'id_usuario',
    as: 'distribuciones'
});

Distribucion.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'repartidor'
});

// Distribucion -> Pedido

Distribucion.belongsTo(Pedido, {
  foreignKey: 'id_pedido',
  as: 'pedido'
});

// Pedido -> Distribucion 
Pedido.hasOne(Distribucion, {
    foreignKey: 'id_pedido',
    as: 'distribuciones'
});

// Un usuario puede tener muchas fórmulas
Usuario.hasMany(Formulas, {
    foreignKey: 'id_usuario',
    as: 'formulas'
});

// Una fórmula pertenece a un usuario
Formulas.belongsTo(Usuario, {
    foreignKey: 'id_usuario',
    as: 'usuario'
});

export {
    Usuario,
    Vehiculo,
    Role,
    RolUsuario,
    Pedido,
    Distribucion,
    Formulas
};