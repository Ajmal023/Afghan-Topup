import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("Ticket", {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customer_user_id: { type: DataTypes.UUID, allowNull: true }, // guest ticket possible if you want
    assignee_user_id: { type: DataTypes.UUID, allowNull: true },
    subject: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "open" }, // open|pending|resolved|closed
    priority: { type: DataTypes.STRING, defaultValue: "normal" },
}, { tableName: "tickets", timestamps: true });
