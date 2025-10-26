import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Currency", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    currency_name: { type: DataTypes.STRING, allowNull: false },
    currency_country: { type: DataTypes.STRING, allowNull: false },
    currency_code: { type: DataTypes.STRING(3), allowNull: false },
    rate: { type: DataTypes.DECIMAL(10, 4), allowNull: false }
}, { tableName: "currencies1", timestamps: true });