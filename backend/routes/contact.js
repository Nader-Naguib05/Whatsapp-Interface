// backend/routes/contact.routes.js
import express from "express";
import {
  getContacts,
  getContactByPhone,
  createContact,
  updateContact,
  deleteContact,
} from "../controllers/contact.controller.js";

const router = express.Router();

// GET /api/contacts?q=optionalQuery
router.get("/", getContacts);

router.get("/by-phone/:phone", getContactByPhone);

// POST /api/contacts
router.post("/", createContact);

router.post("/from-chat", createFromChat);

// PUT /api/contacts/:id
router.put("/:id", updateContact);

// DELETE /api/contacts/:id
router.delete("/:id", deleteContact);

export default router;
