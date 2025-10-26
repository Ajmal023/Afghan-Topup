import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("ProviderConfig", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    provider: { type: DataTypes.STRING, allowNull: false }, 
    name: { type: DataTypes.STRING, allowNull: false }, 
    credentials: { type: DataTypes.JSONB, allowNull: false }, 
    active: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_by: { type: DataTypes.UUID, allowNull: true },
}, { tableName: "provider_configs", timestamps: true });
