import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Role = sequelize.define('Role', {
    id_rol: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'ROLES',
    timestamps: false
});

export default Role;