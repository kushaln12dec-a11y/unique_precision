import { io, type Socket } from "socket.io-client";
import { apiUrl } from "./apiClient";

let socket: Socket | null = null;
let activeToken = "";

export const disconnectAppSocket = () => {
  socket?.disconnect();
  socket = null;
  activeToken = "";
};

export const getAppSocket = () => {
  const token = localStorage.getItem("token")?.trim() || "";
  if (!token) {
    disconnectAppSocket();
    return null;
  }

  if (socket && activeToken === token) {
    return socket;
  }

  disconnectAppSocket();
  activeToken = token;
  socket = io(apiUrl(""), {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });

  return socket;
};
