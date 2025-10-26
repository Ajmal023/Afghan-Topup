import { DataTypes } from "sequelize";
import { requireCurrency } from '../utils/fx.js'

export default (sequelize) => sequelize.define("PaymentIntent", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: true }, // guest allowed
    order_id: { type: DataTypes.UUID, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: false }, // stripe|paypal|aps
    amount_minor: { type: DataTypes.BIGINT, allowNull: false }, // charge currency minor
    currency: {
        type: DataTypes.STRING, allowNull: false, defaultValue: "USD",
        validate: { isValid(v) { requireCurrency(v); } }
    },
    fx_rate_to_usd_snapshot: { type: DataTypes.FLOAT, allowNull: true }, // e.g., 0.012 for 1 AFN = 0.012 USD
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "created" }, // created|pending|succeeded|failed|cancelled
    provider_ref: { type: DataTypes.STRING },
    error_code: { type: DataTypes.STRING },
    error_message: { type: DataTypes.STRING },
}, { tableName: "payment_intents", timestamps: true });
