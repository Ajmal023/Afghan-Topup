export function computeNextRunAt({ from = new Date(), frequency, start_at }) {
    const d = new Date(from);
    if (start_at) return new Date(start_at);
    switch (frequency) {
        case "weekly": d.setDate(d.getDate() + 7); break;
        case "monthly": d.setMonth(d.getMonth() + 1); break;
        case "quarterly": d.setMonth(d.getMonth() + 3); break;
        case "yearly": d.setFullYear(d.getFullYear() + 1); break;
        case "date": return new Date(from);  // if "date" expect the caller to pass start_at
        default: d.setMonth(d.getMonth() + 1);
    }
    return d;
}
