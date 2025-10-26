import { DataTypes } from "sequelize";

/**
 * Base idea:
 * - One row per ISO currency you care about.
 * - Choose a base currency (e.g., AFN) -> rate_to_base = 1.000000
 * - For USD, store AFN-per-USD (e.g., 70.000000)
 * - Use DECIMAL to avoid float drift; keep 6 decimals of precision.
 */
export default (sequelize) =>
    sequelize.define(
        "Currency",
        {
            id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

            code: { type: DataTypes.STRING(3), allowNull: false, unique: true }, // "AFN", "USD"
            name: { type: DataTypes.STRING, allowNull: false },                  // "Afghani", "US Dollar"
            symbol: { type: DataTypes.STRING, allowNull: true },                 // "؋", "$"
            decimals: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 2 },

            // FX relative to base currency (e.g., AFN). If base=AFN then AFN.rate_to_base=1.000000
            rate_to_base: { type: DataTypes.DECIMAL(18, 6), allowNull: false, defaultValue: "1.000000" },

            // Flags & metadata
            is_base: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
            source: { type: DataTypes.STRING },        // "manual", "provider:X"
            fetched_at: { type: DataTypes.DATE },      // when the rate was last updated
            notes: { type: DataTypes.STRING },
        },
        { tableName: "currencies", timestamps: true }
    );
