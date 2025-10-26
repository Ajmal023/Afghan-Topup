import "dotenv/config";
import bcrypt from "bcryptjs";
import { createServer } from "./server.js";

import { syncModels, User } from "./models/index.js"; 


const port = Number(process.env.PORT || 3000);
const app = await createServer();

await syncModels();

console.log("DB synced");
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
        console.log(`Seeded ${user.role} user: ${email}`);
        return;
    }

    if (resetOnBoot) {
        const password_hash = await bcrypt.hash(password, 12);
        await existing.update({ password_hash, role: role === "sales" ? "sales" : "admin", is_email_verified: true });
        console.log(`Updated ${existing.role} password for: ${email}`);
    } else {
        console.log(`Admin user already present: ${email} (no changes)`);
    }
}

await seedAdminFromEnv();



app.listen(port, () => {
    console.log(`API + Admin on http://localhost:${port} (Admin at /admin)`);
});
