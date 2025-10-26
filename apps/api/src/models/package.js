import { DataTypes } from "sequelize";

export default (sequelize) => sequelize.define("Package", {
    id: { 
        type: DataTypes.UUID, 
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true 
    },
    cost: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false 
    },
    cost_currency: { 
        type: DataTypes.STRING, 
        defaultValue: 'USD' 
    },
    value: { 
        type: DataTypes.DECIMAL(10, 2), 
        allowNull: false 
    },
    value_currency: { 
        type: DataTypes.STRING, 
        defaultValue: 'AFN' 
    },
    base_cost: { 
        type: DataTypes.DECIMAL(10, 2) 
    }
}, { 
    tableName: "packages", 
    timestamps: true 
});