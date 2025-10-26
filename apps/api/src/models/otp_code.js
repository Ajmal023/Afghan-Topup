// src/models/otp_code.js
import { DataTypes } from "sequelize";

export default (sequelize) =>
    sequelize.define("OtpCode", {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

        user_id: { type: DataTypes.UUID, allowNull: true }, // null if requested before we match a user
        channel: { type: DataTypes.STRING, allowNull: false }, // 'email' | 'phone'
        destination: { type: DataTypes.STRING, allowNull: false }, // email or phone
        purpose: { type: DataTypes.STRING, allowNull: false }, // 'login' | 'reset_password' | 'verify_contact'

        code_hash: { type: DataTypes.STRING, allowNull: false },
        expires_at: { type: DataTypes.DATE, allowNull: false },
        attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
        consumed: { type: DataTypes.BOOLEAN, defaultValue: false },
    }, {
        tableName: "otp_codes",
        timestamps: true,
        indexes: [
            { fields: ["destination", "purpose"] },
            { fields: ["user_id"] },
            { fields: ["expires_at"] },
        ],
    });
