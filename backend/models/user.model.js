import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'agent', enum: ['admin', 'agent'] },
    status: { type: String, default: 'active', enum: ['active', 'disabled'] },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
