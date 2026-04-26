import { io, type Socket } from "socket.io-client";
import { apiUrl } from "./apiClient";

let socket: Socket | null = null;
let activeToken = "";

export const getAppSocket = () => {
  const token = localStorage.getItem("token")?.trim() || "";
  if (!token) {
    socket?.disconnect();
    socket = null;
    activeToken = "";
    return null;
  }

  if (socket && activeToken === token) {
    return socket;
  }

  socket?.disconnect();
  activeToken = token;
  socket = io(apiUrl(""), {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });

  return socket;
};
