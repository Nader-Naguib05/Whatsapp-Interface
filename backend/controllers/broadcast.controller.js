import fs from "fs";
import csv from "csv-parser";
import { addJob } from "../utils/broadcastRateLimiter.js";

function normalizePhone(phone) {
  return phone.replace(/[^+0-9]/g, "");
}

export const broadcastFromCSV = async (req, res) => {
  const { templateName, language = "en_US", components = [] } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: "CSV file missing" });
  }

  const numbers = [];
  let count = 0;

  console.log("Reading CSV...");

  // Read CSV with progress logs
  await new Promise((resolve) => {
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        const number = row.phone_number;
        if (number) {
          numbers.push(normalizePhone(number));
          count++;

          if (count % 500 === 0) {
            console.log(`Loaded ${count} numbers so far...`);
          }
        }
      })
      .on("end", () => {
        console.log(`CSV load complete. Total numbers: ${numbers.length}`);
        resolve();
      });
  });

  // Remove uploaded CSV file
  fs.unlinkSync(req.file.path);

  console.log(`Queueing ${numbers.length} jobs...`);

  // Queue jobs WITHOUT waiting (fast!)
  const jobPromises = numbers.map((phone, index) => {
    if (index % 500 === 0) {
      console.log(`Queued ${index}/${numbers.length} jobs...`);
    }

    return addJob({ phone, templateName, language, components })
      .then((result) => ({ phone, ...result }))
      .catch((err) => ({ phone, error: err.message }));
  });

  const results = await Promise.all(jobPromises);

  console.log("All jobs queued successfully.");

  res.json({
    status: "queued",
    rateLimit: "20 messages per second (handled by worker)",
    total: numbers.length,
    queued: numbers.length,
    results,
  });
};
