// models/incentive_request.js
import { DataTypes } from "sequelize";

export default (sequelize) =>
    sequelize.define(
        "IncentiveRequest",
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            requester_user_id: { type: DataTypes.UUID, allowNull: false }, // the top customer
            type: { type: DataTypes.ENUM("promo", "referral"), allowNull: false },
            name: { type: DataTypes.STRING, allowNull: false }, // label for admins
            payload: { type: DataTypes.JSON, allowNull: true }, // optional configs
            status: {
                type: DataTypes.ENUM("pending", "approved", "rejected"),
                defaultValue: "pending",
            },
            decided_by_user_id: { type: DataTypes.UUID, allowNull: true },
            decided_at: { type: DataTypes.DATE, allowNull: true },
            // points to either PromoCode.id OR ReferralCode.id (associations use constraints:false)
            result_code_id: { type: DataTypes.UUID, allowNull: true },
            notes: { type: DataTypes.TEXT, allowNull: true },
        },
        { tableName: "incentive_requests", timestamps: true }
    );
