import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("TicketComment", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    ticket_id: { type: DataTypes.UUID, allowNull: false },
    author_user_id: { type: DataTypes.UUID, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    internal: { type: DataTypes.BOOLEAN, defaultValue: false }, // internal note or customer-visible
}, { tableName: "ticket_comments", timestamps: true });
