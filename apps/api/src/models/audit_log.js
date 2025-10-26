import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("AuditLog", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    actor_user_id: { type: DataTypes.UUID },
    action: { type: DataTypes.STRING, allowNull: false },
    entity_type: { type: DataTypes.STRING, allowNull: false },
    entity_id: { type: DataTypes.STRING },
    diff: { type: DataTypes.JSONB },
    ip: DataTypes.STRING,
    user_agent: DataTypes.STRING,
}, { tableName: "audit_logs", timestamps: true, updatedAt: false });
