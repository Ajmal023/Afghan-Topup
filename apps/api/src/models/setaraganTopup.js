import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("SetaraganTopup", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    transaction_id: { type: DataTypes.UUID, allowNull: false },
    customer_mobile: { type: DataTypes.STRING, allowNull: false },
    uid: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    txn_id: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    current_balance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    previous_balance: { type: DataTypes.DECIMAL(15, 2) },
    request_id: { type: DataTypes.STRING, allowNull: false },
    commission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    message: { type: DataTypes.TEXT },
    api_txn_id: { type: DataTypes.STRING },
    operator_id: { type: DataTypes.STRING },
    msisdn: { type: DataTypes.STRING },
    response_data: { type: DataTypes.JSON } 
}, {
    tableName: "setaragan_topups",
    timestamps: true,
    indexes: [
        { fields: ['transaction_id'] },
        { fields: ['customer_mobile'] },
        { fields: ['uid'] },
        { fields: ['txn_id'] },
        { fields: ['request_id'] },
        { fields: ['createdAt'] }
    ]
});