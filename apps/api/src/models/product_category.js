import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("ProductCategory", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    product_id: { type: DataTypes.UUID, allowNull: false },
    category_id: { type: DataTypes.UUID, allowNull: false },
}, { tableName: "product_category", timestamps: true });
