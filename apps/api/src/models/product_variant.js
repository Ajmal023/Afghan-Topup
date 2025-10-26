import { DataTypes } from "sequelize";
import { requireCurrency } from '../utils/fx.js'

export default (sequelize) => sequelize.define("ProductVariant", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    product_id: { type: DataTypes.UUID, allowNull: false },
    operator_id: { type: DataTypes.UUID, allowNull: true }, // for mobile providers
    code: { type: DataTypes.STRING, allowNull: true },      // provider/native code if any
    name: { type: DataTypes.STRING, allowNull: false },     // e.g., "AFN 100 Top-up"
    amount_minor: { type: DataTypes.BIGINT, allowNull: true }, // in AFN minor unit
    currency: {
        type: DataTypes.STRING, allowNull: false, defaultValue: "AFN",
        validate: { isValid(v) { requireCurrency(v); } }
    },
    display_usd_minor: { type: DataTypes.BIGINT, allowNull: true },
    display_usd_rate_to_base: { type: DataTypes.FLOAT, allowNull: true }, // e.g., 0.012 for 1 AFN = 0.012 USD
    display_usd_synced_at: { type: DataTypes.DATE, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_custom_amount: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "product_variants", timestamps: true });
