import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Setting", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    setting_name: { type: DataTypes.STRING, allowNull: false, unique: true },
    value: { type: DataTypes.TEXT, defaultValue: '' },
    setting_details: { type: DataTypes.TEXT }
}, { tableName: "settings", timestamps: true });