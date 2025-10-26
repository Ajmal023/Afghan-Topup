import { DataTypes } from "sequelize";

export default (sequelize) => sequelize.define("PromoCodeRequest", {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    customer_uid: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    first_name: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    last_name: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    whatsapp_number: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    profile_image: { 
        type: DataTypes.STRING 
    },
    id_document: { 
        type: DataTypes.STRING 
    },
    address: { 
        type: DataTypes.TEXT 
    },
    facebook_link: { 
        type: DataTypes.STRING 
    },
    tiktok_link: { 
        type: DataTypes.STRING 
    },
    instagram_link: { 
        type: DataTypes.STRING 
    },
    status: { 
        type: DataTypes.ENUM('pending', 'approved', 'rejected'), 
        defaultValue: 'pending' 
    },
    admin_notes: { 
        type: DataTypes.TEXT 
    },
    handled_by: { 
        type: DataTypes.UUID 
    },
    handled_at: { 
        type: DataTypes.DATE 
    }
}, { 
    tableName: "promo_code_requests", 
    timestamps: true 
});