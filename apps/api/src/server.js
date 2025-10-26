// apps/api/src/server.js
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from './routes/index.js';
import path from "node:path";
import { stripeWebhooksRouter } from './routes/stripeWebhooks.js';
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createServer() {
    const app = express();

    // Security headers
    app.use(helmet());
    app.use("/api/webhook", stripeWebhooksRouter);
    // ✅ FIX: Remove duplicate webhook route from here
    // app.use("/api/webhooks", webhooksRouter); // ❌ REMOVE THIS LINE

    // ✅ Body parser with limits - BUT webhooks will use raw body
    app.use(express.json({ limit: "2mb" }));
    app.use(express.urlencoded({ extended: true, limit: "2mb" }));

    // CORS (adjust origin list)
    app.use(
        cors({
            origin: ["http://localhost:3000", "http://localhost:4000", 'http://localhost:5173', "https://wnffwl6f-5173.inc1.devtunnels.ms"],
            credentials: true,
        })
    );

    // Cookies
    app.use(cookieParser());

    // Logging
    app.use(morgan("dev"));

    // Rate limiter for all requests (basic)
    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 200,
        })
    );

    // ✅ API routes - webhook route is already inside routes/index.js
    app.use("/api", routes);

    // (optional) Serve Admin build if you have one
    const adminDir = path.join(__dirname, "../public-admin");
    app.use("/admin", express.static(adminDir));
    app.get("/admin/*", (_req, res) => res.sendFile(path.join(adminDir, "index.html")));

    // Central error handler (after routes)
    app.use(errorHandler);

    return app;
}