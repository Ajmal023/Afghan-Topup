// apps/api/src/services/jobs/queue.js
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

let connection;
export function getQueueConnection() {
    if (!connection) {
        connection = new IORedis(process.env.REDIS_URL, {
            // Required by BullMQ for blocking commands:
            maxRetriesPerRequest: null,
            // Optional: faster start with old Redis versions
            enableReadyCheck: false,
        });
    }
    return connection;
}

export const reconciliationQueue = new Queue("reconciliation", {
    connection: getQueueConnection(),
});

export function startWorkers() {
    new Worker(
        "reconciliation",
        async (job) => {
            // TODO: your reconciliation work
            return { ok: true, id: job.id };
        },
        { connection: getQueueConnection() }
    );
    console.log("✅ Workers started");
}
