import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("TopupLog", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    order_item_id: { type: DataTypes.UUID, allowNull: false },
    operator_id: { type: DataTypes.UUID, allowNull: false },
    provider: { type: DataTypes.STRING, allowNull: false }, // operator integration
    msisdn: { type: DataTypes.STRING, allowNull: true },
    request_payload: { type: DataTypes.JSON },
    response_payload: { type: DataTypes.JSON },
    status: { type: DataTypes.STRING, allowNull: false }, // sent|accepted|delivered|failed
    provider_txn_id: { type: DataTypes.STRING },
    error_code: { type: DataTypes.STRING },
    error_message: { type: DataTypes.STRING },
    topup_amount_minor: { type: DataTypes.BIGINT, allowNull: true },  // AFN sent
    topup_currency: { type: DataTypes.STRING, allowNull: true },      // e.g., "AFN"
    charged_usd_minor: { type: DataTypes.BIGINT, allowNull: true },
}, { tableName: "topup_logs", timestamps: true });
