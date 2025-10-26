import "dotenv/config";
import bcrypt from "bcryptjs";
import { createServer } from "./server.js";
import { startWorkers } from "./services/jobs/queue.js";
import { syncModels, User } from "./models/index.js"; 
import { initRedis } from "./services/redis.js";
import { startTopupWorker } from "./services/orders/fulfillment.js";
import { startRecurringWorkers } from "./services/recurring/queue.js";

const port = Number(process.env.PORT || 3000);
const app = await createServer();

await syncModels();
await initRedis();
console.log("DB synced");

// ---- Seed admin from .env ----
async function seedAdminFromEnv() {
    const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;
    const role = (process.env.ADMIN_ROLE || "admin").toLowerCase();
    const resetOnBoot = (process.env.RESET_ADMIN_ON_BOOT || "false").toLowerCase() === "true";

    if (!email || !password) {
        console.warn("⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set; skipping admin seed.");
        return;
    }
    if (!["admin", "sales"].includes(role)) {
        console.warn(`⚠️  ADMIN_ROLE "${role}" invalid, defaulting to "admin".`);
    }

    const existing = await User.findOne({ where: { email } });

    if (!existing) {
        const password_hash = await bcrypt.hash(password, 12);
        const user = await User.create({
            email,
            role: role === "sales" ? "sales" : "admin",
            password_hash,
            is_email_verified: true,
        });
        console.log(`✅ Seeded ${user.role} user: ${email}`);
        return;
    }

    // User exists: optionally rotate password on boot
    if (resetOnBoot) {
        const password_hash = await bcrypt.hash(password, 12);
        await existing.update({ password_hash, role: role === "sales" ? "sales" : "admin", is_email_verified: true });
        console.log(`✅ Updated ${existing.role} password for: ${email}`);
    } else {
        console.log(`ℹ️  Admin user already present: ${email} (no changes)`);
    }
}

await seedAdminFromEnv();
// --------------------------------

startWorkers();
startTopupWorker();
startRecurringWorkers();

app.listen(port, () => {
    console.log(`API + Admin on http://localhost:${port} (Admin at /admin)`);
});
