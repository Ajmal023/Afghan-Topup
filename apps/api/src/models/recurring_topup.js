import { DataTypes } from "sequelize";

export default (sequelize) =>
    sequelize.define("RecurringTopup", {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

        // ownership
        user_id: { type: DataTypes.UUID, allowNull: false },

        // what to top up
        product_variant_id: { type: DataTypes.UUID, allowNull: false },
        operator_id: { type: DataTypes.UUID, allowNull: true },
        msisdn: { type: DataTypes.STRING, allowNull: false },

        // amount config (we save both to be safe)
        is_custom_amount: { type: DataTypes.BOOLEAN, defaultValue: false },
        amount_afn_minor: { type: DataTypes.BIGINT, allowNull: true }, // when fixed or saved AFN override
        amount_usd_minor: { type: DataTypes.BIGINT, allowNull: true }, // when custom entered USD
        currency: { type: DataTypes.STRING, allowNull: false, defaultValue: "AFN" },

        // schedule
        frequency: {  // weekly | monthly | quarterly | yearly | date
            type: DataTypes.STRING, allowNull: false
        },
        next_run_at: { type: DataTypes.DATE, allowNull: false },
        scheduled_date: { type: DataTypes.DATE, allowNull: true }, // for frequency="date"
        active: { type: DataTypes.BOOLEAN, defaultValue: true },
        times_run: { type: DataTypes.INTEGER, defaultValue: 0 },

        // payments (for off-session)
        stripe_customer_id: { type: DataTypes.STRING, allowNull: true },
        stripe_payment_method_id: { type: DataTypes.STRING, allowNull: true },
        anchor_day: { type: DataTypes.INTEGER, allowNull: true },
        // diagnostics
        last_run_at: { type: DataTypes.DATE, allowNull: true },
        last_error: { type: DataTypes.STRING, allowNull: true },
    }, { tableName: "recurring_topups", timestamps: true });
