// routes/broadcast.js
import express from "express";
import multer from "multer";
import {
  broadcastFromCSV,
  listBatches,
  getBatchDetails,
} from "../controllers/broadcast.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Upload CSV + start broadcast
router.post("/send", upload.single("file"), broadcastFromCSV);

// List recent batches
router.get("/batches", listBatches);

// Get details of a single batch
router.get("/batches/:id", getBatchDetails);

export default router;
