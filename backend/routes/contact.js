// backend/routes/contact.routes.js
import express from "express";
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
} from "../controllers/contact.controller.js";

const router = express.Router();

// GET /api/contacts?q=optionalQuery
router.get("/", getContacts);

// POST /api/contacts
router.post("/", createContact);

// PUT /api/contacts/:id
router.put("/:id", updateContact);

// DELETE /api/contacts/:id
router.delete("/:id", deleteContact);

export default router;
