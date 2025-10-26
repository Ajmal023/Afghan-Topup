import { DataTypes } from "sequelize";

export default (sequelize) => sequelize.define("SataraganBalance", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false }, 
    previous_balance: { type: DataTypes.DECIMAL(15, 2) },
    transaction_id: { type: DataTypes.UUID },
    topup_id: { type: DataTypes.STRING },
    amount: { type: DataTypes.DECIMAL(10, 2) },
    type: { type: DataTypes.STRING, defaultValue: 'debit' },
    notes: { type: DataTypes.TEXT }
}, { 
    tableName: "sataragan_balance", 
    timestamps: true 
});