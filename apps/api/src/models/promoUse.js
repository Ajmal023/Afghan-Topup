import { DataTypes } from "sequelize";

export default (sequelize) => sequelize.define("PromoUse", {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    promo_code_id: { 
        type: DataTypes.UUID, 
        allowNull: false 
    },
    customer_uid: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    order_id: { 
        type: DataTypes.UUID 
    },
    transaction_id: { 
        type: DataTypes.UUID 
    },
    original_amount: { 
        type: DataTypes.DECIMAL(10, 2) 
    },
    discount_amount: { 
        type: DataTypes.DECIMAL(10, 2) 
    },
    final_amount: { 
        type: DataTypes.DECIMAL(10, 2) 
    },
    status: { 
        type: DataTypes.ENUM('pending', 'used', 'failed'),
        defaultValue: 'pending'
    },
    applied: { // ADD THIS FIELD
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, { 
    tableName: "promo_uses", 
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['promo_code_id', 'customer_uid']
        }
    ]
});