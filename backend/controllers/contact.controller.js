// backend/controllers/contact.controller.js
import { Contact } from "../models/contact.model.js";

export const getContacts = async (req, res) => {
    try {
        const { q } = req.query;

        const filter = {};
        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), "i");
            filter.$or = [{ name: regex }, { phone: regex }];
        }

        const contacts = await Contact.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json(contacts);
    } catch (err) {
        console.error("getContacts error:", err);
        res.status(500).json({ error: "Failed to fetch contacts" });
    }
};

export const getContactByPhone = async (req, res) => {
    try {
        const { phone } = req.params;

        if (!phone) {
            return res.status(400).json({ error: "Phone is required" });
        }

        const contact = await Contact.findOne({ phone: phone.trim() }).lean();

        if (!contact) {
            return res.json(null); // not an error, just not found
        }

        res.json(contact);
    } catch (err) {
        console.error("getContactByPhone error:", err);
        res.status(500).json({ error: "Failed to fetch contact" });
    }
};

export const createContact = async (req, res) => {
    try {
        const { name, phone, notes } = req.body;

        if (!name || !phone) {
            return res
                .status(400)
                .json({ error: "Name and phone are required" });
        }

        const existing = await Contact.findOne({ phone: phone.trim() });
        if (existing) {
            return res.status(400).json({ error: "Contact already exists" });
        }

        const contact = await Contact.create({
            name: name.trim(),
            phone: phone.trim(),
            notes: notes?.trim() || "",
        });

        res.status(201).json(contact);
    } catch (err) {
        console.error("createContact error:", err);
        res.status(500).json({ error: "Failed to create contact" });
    }
};

export const createFromChat = async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    const normalized = phone.trim();

    const exists = await Contact.findOne({ phone: normalized });
    if (exists) return res.json(exists);

    const contact = await Contact.create({
      phone: normalized,
      name: name?.trim() || normalized, // default fallback
      notes: ""
    });

    res.status(201).json(contact);
  } catch (err) {
    console.error("createFromChat error:", err);
    res.status(500).json({ error: "Failed to save contact" });
  }
};


export const updateContact = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, notes } = req.body;

        const contact = await Contact.findById(id);
        if (!contact)
            return res.status(404).json({ error: "Contact not found" });

        if (name !== undefined) contact.name = name.trim();
        if (phone !== undefined) contact.phone = phone.trim();
        if (notes !== undefined) contact.notes = notes.trim();

        await contact.save();

        res.json(contact);
    } catch (err) {
        console.error("updateContact error:", err);
        res.status(500).json({ error: "Failed to update contact" });
    }
};

export const deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Contact.findByIdAndDelete(id);
        if (!deleted)
            return res.status(404).json({ error: "Contact not found" });

        res.json({ success: true });
    } catch (err) {
        console.error("deleteContact error:", err);
        res.status(500).json({ error: "Failed to delete contact" });
    }
};
