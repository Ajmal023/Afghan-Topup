import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("ProductType", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    code: { type: DataTypes.STRING, unique: true, allowNull: false }, // e.g. "mobile_topup","data_bundle","voice_bundle"
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
}, { tableName: "product_types", timestamps: true });
