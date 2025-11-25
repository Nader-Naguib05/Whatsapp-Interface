import { io } from "socket.io-client";

export const createSocket = () => {
  return io(import.meta.env.VITE_API_URL, {
    transports: ["websocket"],
  });
};
