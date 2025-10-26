import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Session", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    jti: { type: DataTypes.STRING, unique: true, allowNull: false },
    refresh_token_hash: { type: DataTypes.STRING, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false },
    ip: DataTypes.STRING,
    user_agent: DataTypes.STRING,
    expires_at: { type: DataTypes.DATE, allowNull: false },
}, { tableName: "sessions", timestamps: true });
