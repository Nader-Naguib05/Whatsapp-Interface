import express from "express";
import multer from "multer";
import { broadcastFromCSV } from "../controllers/broadcast.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/send", upload.single("file"), broadcastFromCSV);

export default router;
