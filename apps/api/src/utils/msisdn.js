
export function normalizeAfMsisdn(raw) {
    if (!raw) return { ok: false, reason: "missing msisdn" };
    let s = String(raw).trim().replace(/[^\d+]/g, "");

    // +93XXXXXXXXX
    if (s.startsWith("+93")) {
        s = s.slice(3);
        if (!/^\d{9}$/.test(s)) return { ok: false, reason: "invalid length" };
        return parseAfNational("0" + s);
    }

    // 0093XXXXXXXXX
    if (s.startsWith("0093")) {
        s = s.slice(4);
        if (!/^\d{9}$/.test(s)) return { ok: false, reason: "invalid length" };
        return parseAfNational("0" + s);
    }

    // 93XXXXXXXXX (no plus)
    if (s.startsWith("93")) {
        s = s.slice(2);
        if (!/^\d{9}$/.test(s)) return { ok: false, reason: "invalid length" };
        return parseAfNational("0" + s);
    }

    // National 0XXXXXXXXX
    if (/^0\d{9}$/.test(s)) {
        return parseAfNational(s);
    }

    return { ok: false, reason: "invalid format" };
}

function parseAfNational(national) {
    // AWCC for this phase: 070 / 071
    const isAwcc = /^07[01]/.test(national);
    const e164 = "93" + national.slice(1); // digits-only, no '+'
    return {
        ok: true,
        e164,        // e.g. "93700……"
        national,    // e.g. "0700……"
        operatorCode: isAwcc ? "AWCC" : "UNKNOWN",
    };
}