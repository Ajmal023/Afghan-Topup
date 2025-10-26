import { DataTypes } from "sequelize";
export default (sequelize) => sequelize.define("PromoCode", {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    code: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true 
    },
    description: { 
        type: DataTypes.TEXT 
    },
    discount_type: { 
        type: DataTypes.ENUM('fixed', 'percentage'), 
        allowNull: false 
    },
    discount_value: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false 
    },
    max_discount: { 
        type: DataTypes.DECIMAL(10, 2) 
    },
    min_order_amount: { 
        type: DataTypes.DECIMAL(10, 2), 
        defaultValue: 0 
    },
    usage_limit: { 
        type: DataTypes.INTEGER, 
        allowNull: false 
    },
    used_count: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0 
    },
    valid_from: { 
        type: DataTypes.DATE, 
        allowNull: false 
    },
    valid_until: { 
        type: DataTypes.DATE, 
        allowNull: false 
    },
    is_active: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    },
    is_public: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true 
    },
    customer_uid: { 
        type: DataTypes.STRING 
    },
    created_by: { 
        type: DataTypes.UUID 
    },
    promo_request_id: { 
        type: DataTypes.UUID 
    }
}, { 
    tableName: "promo_codes", 
    timestamps: true 
});