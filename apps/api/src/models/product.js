import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Product", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    product_type_id: { type: DataTypes.UUID, allowNull: false },
    sku: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    operator_id: { type: DataTypes.UUID, allowNull: true },
}, { tableName: "products", timestamps: true });
