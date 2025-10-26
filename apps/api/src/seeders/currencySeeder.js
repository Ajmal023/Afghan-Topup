// src/seeders/currencySeeder.js
import { sequelize } from '../models/index.js';
import { Currency1 } from '../models/index.js';

export const seedCurrencies = async () => {
    try {
        const currencies = [
            { currency_code: 'USD', currency_name: 'US Dollar', currency_country: 'United States', rate: 1.0000 },
            { currency_code: 'EUR', currency_name: 'Euro', currency_country: 'European Union', rate: 0.9200 },
            { currency_code: 'AFN', currency_name: 'Afghan Afghani', currency_country: 'Afghanistan', rate: 70.0000 },
            { currency_code: 'GBP', currency_name: 'British Pound', currency_country: 'United Kingdom', rate: 0.7900 },
            { currency_code: 'INR', currency_name: 'Indian Rupee', currency_country: 'India', rate: 83.0000 },
            { currency_code: 'PKR', currency_name: 'Pakistani Rupee', currency_country: 'Pakistan', rate: 280.0000 },
            { currency_code: 'CNY', currency_name: 'Chinese Yuan', currency_country: 'China', rate: 7.2000 },
            { currency_code: 'AED', currency_name: 'UAE Dirham', currency_country: 'United Arab Emirates', rate: 3.6700 }
        ];

        for (const currency of currencies) {
            await Currency1.findOrCreate({
                where: { currency_code: currency.currency_code },
                defaults: currency
            });
        }

        console.log('✅ Currency data seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding currency data:', error);
        throw error;
    }
};


if (import.meta.url === `file://${process.argv[1]}`) {
    (async () => {
        try {
            await sequelize.authenticate();
            console.log('Database connected');
            await seedCurrencies();
            console.log('Seeder completed');
            process.exit(0);
        } catch (error) {
            console.error('Seeder failed:', error);
            process.exit(1);
        }
    })();
}