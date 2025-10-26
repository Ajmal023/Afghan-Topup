import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Transaction", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    phone_number: { type: DataTypes.STRING, allowNull: false },
    network: { type: DataTypes.STRING, defaultValue: "Afghan Network" },
    uid: { type: DataTypes.STRING, allowNull: false },
    payment_id: { type: DataTypes.STRING },
    original_amount: { type: DataTypes.DECIMAL(10, 2) },
    discount_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    promo_code: { type: DataTypes.STRING },
    promo_code_id: { type: DataTypes.UUID },
    status: { type: DataTypes.ENUM('Pending', 'Paid', 'Confirmed', 'Rejected', 'failed'), defaultValue: 'Pending' },
    output: { type: DataTypes.INTEGER, defaultValue: 1 }, 
    stripe_status: { type: DataTypes.STRING },
    currency: { type: DataTypes.STRING, defaultValue: 'USD' },
    is_checked: { type: DataTypes.BOOLEAN, defaultValue: false } 
}, { tableName: "transactions", timestamps: true });