// controllers/broadcast.controller.js
import fs from "fs";
import csv from "csv-parser";
import { addJob } from "../utils/broadcastRateLimiter.js";
import { BroadcastBatch } from "../models/broadcastBatch.model.js";

function normalizePhone(phone) {
    return phone.replace(/[^+0-9]/g, "");
}

function isValidPhone(phone) {
    // Basic sanity check, you can tighten this later
    return /^\+?\d{7,15}$/.test(phone);
}

// POST /broadcast/send
export const broadcastFromCSV = async (req, res) => {
    const {
        templateName,
        language = "en_US",
        components = [],
        batchName, // optional, from client
    } = req.body;

    if (!templateName) {
        return res.status(400).json({ error: "templateName is required" });
    }

    if (!req.file) {
        return res.status(400).json({ error: "CSV file missing" });
    }

    console.log("Reading CSV for broadcast...");

    const rawNumbers = [];

    await new Promise((resolve) => {
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on("data", (row) => {
                let numberColumn = req.body.numberColumn || "phone_number";
                numberColumn = numberColumn.replace(/['"]/g, "").trim(); // remove quotes

                const number = row[numberColumn];

                if (number) {
                    rawNumbers.push(number);
                }
            })
            .on("end", () => {
                console.log(
                    `CSV load complete. Raw numbers count: ${rawNumbers.length}`
                );
                resolve();
            });
    });

    // Remove uploaded CSV file
    fs.unlinkSync(req.file.path);

    // Normalize & dedupe
    const normalized = rawNumbers
        .map(normalizePhone)
        .filter((n) => !!n && isValidPhone(n));

    const uniqueNumbers = [...new Set(normalized)];

    if (!uniqueNumbers.length) {
        return res.status(400).json({
            error: "No valid phone numbers found in CSV.",
        });
    }

    console.log(
        `After normalization & dedupe: ${uniqueNumbers.length} unique valid numbers.`
    );

    // Create a batch entry
    const batch = await BroadcastBatch.create({
        name: batchName || `Broadcast ${new Date().toISOString()}`,
        templateName,
        language,
        totalNumbers: uniqueNumbers.length,
        queuedCount: 0,
        successCount: 0,
        failedCount: 0,
        status: "queued",
        originalFileName: req.file.originalname,
    });

    console.log(`Created broadcast batch ${batch._id}`);

    // Queue jobs (this only ensures they're queued, not delivered)
    const enqueuePromises = uniqueNumbers.map((phone, index) => {
        if (index > 0 && index % 500 === 0) {
            console.log(
                `Enqueued ${index}/${uniqueNumbers.length} jobs so far...`
            );
        }

        return addJob({
            phone,
            templateName,
            language,
            components,
            batchId: batch._id,
        });
    });

    await Promise.all(enqueuePromises);

    console.log(
        `All ${uniqueNumbers.length} messages queued for batch ${batch._id}`
    );

    // Respond with batch info; frontend can poll or use sockets later
    return res.json({
        status: "queued",
        batchId: batch._id,
        templateName,
        language,
        totalNumbers: uniqueNumbers.length,
    });
};

// ---------- Extra endpoints for frontend (Phase 1 UI support) ----------

// GET /broadcast/batches
export const listBatches = async (req, res) => {
    const batches = await BroadcastBatch.find({})
        .sort({ createdAt: -1 })
        .limit(50);

    res.json(batches);
};

// GET /broadcast/batches/:id
export const getBatchDetails = async (req, res) => {
    const { id } = req.params;

    const batch = await BroadcastBatch.findById(id);
    if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
    }

    // later you can also paginate messages here if you want
    res.json(batch);
};
