export function redactPayload(payload) {
    if (payload == null) return payload;
    try {
        const str = typeof payload === "string" ? payload : JSON.stringify(payload);
        // very light redaction for msisdn + tokens/keys
        return str
            .replace(/(\+?\d{9,15})/g, (m) => m.slice(0, 3) + "*****" + m.slice(-2))
            .replace(/("?(token|key|secret|password)"?\s*:\s*)"[^"]*"/gi, '$1"[redacted]"');
    } catch {
        return "[unreadable]";
    }
}
