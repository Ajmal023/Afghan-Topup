import { DataTypes } from "sequelize";
import { requireCurrency } from '../utils/fx.js'

export default (sequelize) => sequelize.define("OrderItem", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_id: { type: DataTypes.UUID, allowNull: false },
    product_variant_id: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unit_price_minor: { type: DataTypes.BIGINT, allowNull: false }, // AFN minor
    currency: {
        type: DataTypes.STRING, allowNull: false, defaultValue: "AFN",
        validate: { isValid(v) { requireCurrency(v); } }
    },
    msisdn: { type: DataTypes.STRING, allowNull: true },
    operator_id: { type: DataTypes.UUID, allowNull: true },
    display_usd_minor: { type: DataTypes.BIGINT, allowNull: true },
    fx_rate_to_usd_snapshot: { type: DataTypes.FLOAT, allowNull: true },
    is_custom_amount: { type: DataTypes.BOOLEAN, defaultValue: false },
    customer_entered_usd_minor: { type: DataTypes.BIGINT, allowNull: true },
}, { tableName: "order_items", timestamps: true });
