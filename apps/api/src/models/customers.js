import { DataTypes } from "sequelize";

export default (sequelize) => sequelize.define("Customers", {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    uid: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true 
    },
    first_name: { 
        type: DataTypes.STRING, 
        allowNull: true,
        defaultValue: ''
    },
    last_name: { 
        type: DataTypes.STRING, 
        allowNull: true,
        defaultValue: ''
    },
    profile_image: { 
        type: DataTypes.STRING,
        allowNull: true
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false,
        validate: { isEmail: true }
    },
    phone_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    whatsapp_number: {
        type: DataTypes.STRING,
        allowNull: true
    },
    country_code: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'AF'
    },
    status: { 
        type: DataTypes.ENUM('active', 'inactive'), 
        defaultValue: 'active' 
    }
}, { 
    tableName: "customers",  // Change to lowercase to match your actual table
    timestamps: true 
});