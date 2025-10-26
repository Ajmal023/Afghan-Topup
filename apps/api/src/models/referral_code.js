import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("ReferralCode", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    owner_user_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING, unique: true, allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    max_uses: { type: DataTypes.INTEGER, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true },
}, { tableName: "referral_codes", timestamps: true });
