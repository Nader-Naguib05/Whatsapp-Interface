// controllers/users.controller.js
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";

// ---------------------------
// CREATE (Admin only)
// ---------------------------
export const createUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admins only." });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields." });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email already exists." });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "agent",
      status: "active",
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ---------------------------
// GET ALL USERS (Admin only)
// ---------------------------
export const getUsers = async (req, res) => {
  console.log(req.user);
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only." });
  }

  const users = await User.find().sort({ createdAt: -1 });
  res.json(users);
};

// ---------------------------
// GET USER (Self or Admin)
// ---------------------------
export const getUser = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== "admin" && req.user._id.toString() !== id) {
    return res.status(403).json({ message: "Not allowed." });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found." });

  res.json(user);
};

// ---------------------------
// UPDATE USER (Self or Admin)
// ---------------------------
export const updateUser = async (req, res) => {
  const { id } = req.params;

  // Allow admin to update anyone
  // Allow user to update their own name/password
  const isSelf = req.user._id.toString() === id;

  if (!isSelf && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed." });
  }

  const updates = {};

  if (req.body.name) updates.name = req.body.name;

  if (req.body.password) {
    updates.password = await bcrypt.hash(req.body.password, 10);
  }

  // Only admins can change role or status
  if (req.user.role === "admin") {
    if (req.body.role) updates.role = req.body.role;
  }

  const user = await User.findByIdAndUpdate(id, updates, { new: true });
  res.json(user);
};

// ---------------------------
// DELETE USER (Admin only, cannot delete self, cannot delete last admin)
// ---------------------------
export const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only." });
  }

  const isSelf = req.user._id.toString() === id;
  if (isSelf) {
    return res.status(400).json({ message: "You cannot delete your own account." });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found." });

  if (user.role === "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(400).json({ message: "Cannot delete the last admin." });
    }
  }

  await User.findByIdAndDelete(id);
  res.json({ message: "User deleted." });
};

// ---------------------------
// TOGGLE STATUS (Admin only, cannot disable self, cannot disable last admin)
// ---------------------------
export const toggleStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only." });
  }

  const isSelf = req.user._id.toString() === id;
  if (isSelf) {
    return res.status(400).json({ message: "You cannot disable your own account." });
  }

  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: "User not found." });

  if (user.role === "admin" && status === "disabled") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      return res.status(400).json({ message: "Cannot disable the last admin." });
    }
  }

  user.status = status;
  await user.save();

  res.json(user);
};
