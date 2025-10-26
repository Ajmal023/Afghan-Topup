import { Currency } from "../models/index.js";

let CACHE = {
    at: 0,
    ttlMs: 60_000,     // 60s
    base: null,        // Currency row marked is_base=true
    map: new Map(),    // code -> Currency row
};

async function loadIfStale() {
    const now = Date.now();
    if (now - CACHE.at < CACHE.ttlMs && CACHE.map.size) return;
    const rows = await Currency.findAll();
    const map = new Map(rows.map(r => [r.code, r]));
    const base = rows.find(r => r.is_base) || rows.find(r => r.code === "AFN") || null;
    CACHE = { at: now, ttlMs: CACHE.ttlMs, base, map };
}

export async function getCurrency(code) {
    await loadIfStale();
    return CACHE.map.get(String(code).toUpperCase());
}

export async function getBaseCurrency() {
    await loadIfStale();
    return CACHE.base;
}

export function invalidateFxCache() {
    CACHE.at = 0;
}

/**
 * Convert integer minor units between currencies using rate_to_base.
 * - amountMinor: integer (number or BigInt)
 * - fromCode, toCode: "AFN", "USD", ...
 * Returns BigInt of target minor units (rounded).
 */
export async function convertMinor(amountMinor, fromCode, toCode) {
    await loadIfStale();
    fromCode = String(fromCode).toUpperCase();
    toCode = String(toCode).toUpperCase();
    if (fromCode === toCode) return BigInt(amountMinor);

    const from = CACHE.map.get(fromCode);
    const to = CACHE.map.get(toCode);
    const base = CACHE.base;
    if (!from || !to || !base) throw new Error("Currency config missing");

    const fromMinorMul = 10 ** Number(from.decimals ?? 2);
    const toMinorMul = 10 ** Number(to.decimals ?? 2);

    // minor -> major (number)
    const amountMajorFrom = Number(amountMinor) / fromMinorMul;

    // via base: amount_in_base = amount_from * (from.rate_to_base)
    const amountInBase = amountMajorFrom * Number(from.rate_to_base);

    // to target: amount_to = amount_in_base / (to.rate_to_base)
    const amountMajorTo = amountInBase / Number(to.rate_to_base);

    // back to minor (rounded)
    const minor = Math.round(amountMajorTo * toMinorMul);
    return BigInt(minor);
}

export function requireCurrency(code) {
    const allowed = ["AFN", "USD"];
    if (!allowed.includes(code.toUpperCase())) {
        throw new Error(`Invalid currency code: ${code}`);
    }
    return true;
}
