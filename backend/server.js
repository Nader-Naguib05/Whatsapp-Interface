// server.mjs
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

import webhookRoutes from './routes/webhook.js';
import messageRoutes from './routes/messages.js';
import conversationRoutes from './routes/conversations.js';
import authRoutes from "./routes/auth.js";
import broadcastRoutes from "./routes/broadcast.js";
import { setupSockets } from './sockets/chatSocket.js';

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));


// routes
app.use('/webhook', webhookRoutes);
app.use('/messages', messageRoutes);
app.use('/conversations', conversationRoutes);
app.use('/broadcast', broadcastRoutes);
app.use('/auth', authRoutes);


// connect db & sockets & start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  try {
    if (!MONGO_URI) throw new Error('MONGO_URI not provided in .env');

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');

    setupSockets(server);

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();
