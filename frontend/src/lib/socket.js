import { io } from "socket.io-client";

export const createSocket = () => {
    const token = localStorage.getItem("token");

    return io(import.meta.env.VITE_API_URL, {
        transports: ["websocket"],
        auth: { token },
    });
};
