import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("ReferralUse", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    referral_code_id: { type: DataTypes.UUID, allowNull: false },
    referrer_user_id: { type: DataTypes.UUID, allowNull: false },
    referred_user_id: { type: DataTypes.UUID, allowNull: false },
    order_id: { type: DataTypes.UUID, allowNull: true },
}, { tableName: "referral_uses", timestamps: true });
