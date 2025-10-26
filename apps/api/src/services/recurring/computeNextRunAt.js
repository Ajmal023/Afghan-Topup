// services/recurring/computeNextRunAt.js
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

/**
 * Returns a JS Date in UTC. We:
 *  - anchor to UTC midnight (not local) to avoid TZ drift,
 *  - add by week/month/quarter/year,
 *  - keep the original day-of-month (dayjs handles clamping, e.g. 31 → 30/29),
 *  - never change the hour/min/sec (always 00:00:00Z).
 */
export function computeNextRunAt({
    from = new Date(),
    frequency = "monthly",
    start_at = null,
}) {
    // always anchor to UTC midnight to avoid surprises
    const base = start_at
        ? dayjs.utc(start_at).startOf("day")
        : dayjs.utc(from).startOf("day");

    switch (String(frequency).toLowerCase()) {
        case "weekly": return base.add(1, "week").toDate();
        case "monthly": return base.add(1, "month").toDate();
        case "quarterly": return base.add(3, "month").toDate();
        case "yearly": return base.add(1, "year").toDate();
        case "date": return (start_at ? dayjs.utc(start_at).startOf("day") : base).toDate();
        default: return base.add(1, "month").toDate();
    }
}
