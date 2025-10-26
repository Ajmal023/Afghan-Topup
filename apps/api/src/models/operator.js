import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Operator", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING, unique: true, allowNull: false }, // e.g., "AWCC","ETISALAT"
    name: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, defaultValue: "AF" },
    provider_code: { type: DataTypes.STRING, allowNull: true }
}, { tableName: "operators", timestamps: true });
