import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("ApiSataragan", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    status: { type: DataTypes.STRING },
    txn_id: { type: DataTypes.STRING },
    amount: { type: DataTypes.DECIMAL(10, 2) },
    customer_mobile: { type: DataTypes.STRING },
    commission: { type: DataTypes.DECIMAL(10, 2) },
    message: { type: DataTypes.TEXT },
    api_txn_id: { type: DataTypes.STRING },
    date: { type: DataTypes.DATE },
    request_id: { type: DataTypes.STRING }
}, { tableName: "api_sataragan", timestamps: true });