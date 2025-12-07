import express from "express";
import {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleStatus
} from "../controllers/users.controller.js";
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);

// Public: Create user
router.post("/", createUser);

// Protected: all routes after this require authentication

// READ
router.get("/", getUsers);

// UPDATE
router.patch("/:id", updateUser);

// UPDATE STATUS
router.patch("/:id/status", toggleStatus);

// DELETE
router.delete("/:id", deleteUser);

export default router;
