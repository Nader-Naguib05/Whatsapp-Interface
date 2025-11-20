// sockets/chatSocket.mjs
import { Server } from 'socket.io';

let io = null;

export function setupSockets(server) {
  io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('joinConversation', (conversationId) => {
      socket.join(conversationId);
    });

    socket.on('leaveConversation', (conversationId) => {
      socket.leave(conversationId);
    });

    socket.on('disconnect', () => {
      // console.log('Socket disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized. Call setupSockets(server) first.');
  return io;
}
