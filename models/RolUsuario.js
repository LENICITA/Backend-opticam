import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const RolUsuario = sequelize.define('RolUsuario', {
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'ROLES',
            key: 'id_rol'
        }
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'USUARIOS',
            key: 'id_usuario'
        }
    }
}, {
    tableName: 'ROL_USUARIO',
    timestamps: false
});

export default RolUsuario;