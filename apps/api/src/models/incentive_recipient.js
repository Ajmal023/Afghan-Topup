// models/incentive_recipient.js
import { DataTypes } from "sequelize";

export default (sequelize) =>
    sequelize.define(
        "IncentiveRecipient",
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            request_id: { type: DataTypes.UUID, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: true },
            msisdn: { type: DataTypes.STRING, allowNull: true },
        },
        { tableName: "incentive_recipients", timestamps: true }
    );

// Named factories to avoid name collisions in index.js:
export const PromoAudienceModel = (sequelize) =>
    sequelize.define(
        "PromoAudience",
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            promo_code_id: { type: DataTypes.UUID, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: true },
            msisdn: { type: DataTypes.STRING, allowNull: true },
        },
        { tableName: "promo_audience", timestamps: false }
    );

export const ReferralAudienceModel = (sequelize) =>
    sequelize.define(
        "ReferralAudience",
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
            referral_code_id: { type: DataTypes.UUID, allowNull: false },
            email: { type: DataTypes.STRING, allowNull: true },
            msisdn: { type: DataTypes.STRING, allowNull: true },
        },
        { tableName: "referral_audience", timestamps: false }
    );
