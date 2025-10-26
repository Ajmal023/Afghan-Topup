import { Router } from "express";
import { Currency, Currency1 } from "../models/index.js";
import { requireAuth, requireRole } from "../middlewares/auth.js";
import { convertMinor, invalidateFxCache, getCurrency, getBaseCurrency } from "../utils/fx.js";
import { requireApiKey } from "../middlewares/apiKeyAuth.js";

export const currenciesRouter = Router();


currenciesRouter.get("/", requireAuth, requireRole("admin"), async (_req, res, next) => {
    try {
        const rows = await Currency.findAll({ order: [["code", "ASC"]] });
        res.json({ data: rows });
    } catch (e) { next(e); }
});
currenciesRouter.put("/:code", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const code = String(req.params.code).toUpperCase();
        const { name, symbol, decimals, rate_to_base, is_base, source, notes } = req.body || {};

        if (is_base === true) {
            await Currency.update({ is_base: false }, { where: { is_base: true } });
        }

        const [row, created] = await Currency.upsert({
            code,
            name,
            symbol,
            decimals,
            rate_to_base,
            is_base: !!is_base,
            source: source || "manual",
            fetched_at: new Date(),
            notes
        }, { returning: true });

        invalidateFxCache();
        res.status(created ? 201 : 200).json({ data: row });
    } catch (e) { next(e); }
});
currenciesRouter.get("/convert", requireAuth, requireRole("admin"), async (req, res, next) => {
    try {
        const amount_minor = req.query.amount_minor;
        const from = req.query.from;
        const to = req.query.to;
        if (amount_minor == null || !from || !to) {
            return res.status(400).json({ error: "amount_minor, from, to are required" });
        }
        const out = await convertMinor(BigInt(amount_minor), from, to);
        res.json({
            input: { amount_minor: String(amount_minor), from, to },
            output_minor: String(out)
        });
    } catch (e) { next(e); }
});


currenciesRouter.get("/:code", requireApiKey, async (req, res, next) => {
    try {
        const { code } = req.params;
        
        const currency = await Currency1.findOne({ 
            where: { currency_country: code } 
        });

        if (!currency) {
            return res.status(404).json({ error: "Currency not found" });
        }

        res.json({
            data: {
                rate: currency.rate,
                code: currency.currency_code
            }
        });
    } catch (error) {
        if (error.message.includes("Unauthorized")) {
            return res.status(401).json({ data: "Unauthorized" });
        }
        next(error);
    }
});

currenciesRouter.get("/", requireApiKey, async (req, res, next) => {
    try {
        const currencies = await Currency1.findAll({
            attributes: ['rate', 'currency_code']
        });

        const currencyList = currencies.map(currency => ({
            rate: currency.rate,
            code: currency.currency_code
        }));

        res.json({ data: currencyList });
    } catch (error) {
        if (error.message.includes("Unauthorized")) {
            return res.status(401).json({ data: "Unauthorized" });
        }
        next(error);
    }
});