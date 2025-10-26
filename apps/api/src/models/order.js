import { DataTypes } from "sequelize";
import { requireCurrency } from '../utils/fx.js'

export default (sequelize) => sequelize.define("Order", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_no: { type: DataTypes.STRING, allowNull: false, unique: true },
    user_id: { type: DataTypes.UUID, allowNull: true }, // null for guest
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "created" }, // created|paid|fulfilled|cancelled|refunded
    total_minor: { type: DataTypes.BIGINT, allowNull: false },
    currency: {
        type: DataTypes.STRING, allowNull: false, defaultValue: "AFN",
        validate: { isValid(v) { requireCurrency(v); } }
    },
    fx_rate_to_usd_snapshot: { type: DataTypes.FLOAT, allowNull: true }, // e.g., 0.012 for 1 AFN = 0.012 USD
    email: DataTypes.STRING,         // capture for guest checkout
    phone: DataTypes.STRING,
}, { tableName: "orders", timestamps: true });
