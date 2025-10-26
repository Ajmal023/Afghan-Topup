import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Contact", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    msisdn: { type: DataTypes.STRING, allowNull: false }, // validated phone
    operator_id: { type: DataTypes.UUID },
    notes: DataTypes.STRING,
}, { tableName: "contacts", timestamps: true });
