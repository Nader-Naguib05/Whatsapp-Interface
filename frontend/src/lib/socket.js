import { io } from "socket.io-client";

export const createSocket = () => {
  return io("http://localhost:5000", {
    transports: ["websocket"],
  });
};
