import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Category", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    slug: { type: DataTypes.STRING, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    parent_id: { type: DataTypes.UUID, allowNull: true }, // optional nesting
}, { tableName: "categories", timestamps: true });
