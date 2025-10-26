import { AuditLog } from "../models/index.js";

export const audit = async (actorUserId, action, entityType, entityId, diff = null, meta = {}) => {
    try {
        await AuditLog.create({
            actor_user_id: actorUserId,   // 👈 matches your model
            action,
            entity_type: entityType,
            entity_id: entityId,
            diff,
            ip: meta.ip,
            user_agent: meta.ua,
        });
    } catch (err) {
        console.error("Audit log error:", err);
    }
};
