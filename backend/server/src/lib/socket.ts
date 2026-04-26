import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyAuthToken, type AuthenticatedUser } from "../middleware/auth.middleware";
import { JOBS_UPDATED_EVENT, type JobsUpdateEvent } from "./jobEvents";

type ClientToServerEvents = {
  "jobs:sync": () => void;
};

type ServerToClientEvents = {
  [JOBS_UPDATED_EVENT]: (event: JobsUpdateEvent) => void;
};

type SocketData = {
  user: AuthenticatedUser;
};

let io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> | null = null;

const getHandshakeToken = (socket: {
  handshake: {
    auth?: { token?: unknown };
    query?: { token?: unknown };
    headers?: { authorization?: unknown };
  };
}) => {
  const authToken = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token.trim() : "";
  if (authToken) return authToken;

  const queryToken = typeof socket.handshake.query?.token === "string" ? socket.handshake.query.token.trim() : "";
  if (queryToken) return queryToken;

  const authorization =
    typeof socket.handshake.headers?.authorization === "string" ? socket.handshake.headers.authorization : "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  return bearerToken;
};

export const initSocketServer = (server: HttpServer) => {
  io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = getHandshakeToken(socket);
    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }

    try {
      socket.data.user = verifyAuthToken(token);
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket.data;
    const role = String(user.role || "").trim().toUpperCase();

    socket.join("jobs");
    socket.join(`user:${user.userId}`);
    if (role) {
      socket.join(`role:${role}`);
    }

    socket.on("jobs:sync", () => {
      socket.join("jobs");
    });
  });

  return io;
};

export const getSocketServer = () => {
  if (!io) {
    throw new Error("Socket.IO server has not been initialized");
  }
  return io;
};

export const emitJobsUpdated = (payload: {
  groupId?: string | number | bigint | null;
  jobId?: string | number | bigint | null;
  updatedBy?: string | null;
  source?: string;
  userId?: string | number | bigint | null;
}) => {
  if (!io) {
    return;
  }

  const event: JobsUpdateEvent = {
    type: "jobs:updated",
    updatedAt: new Date().toISOString(),
    ...(payload.groupId !== undefined && payload.groupId !== null ? { groupId: String(payload.groupId) } : {}),
    ...(payload.jobId !== undefined && payload.jobId !== null ? { jobId: String(payload.jobId) } : {}),
    ...(payload.updatedBy ? { updatedBy: String(payload.updatedBy).trim().toUpperCase() } : {}),
    ...(payload.source ? { source: payload.source } : {}),
  };

  if (payload.userId !== undefined && payload.userId !== null) {
    io.to(`user:${String(payload.userId)}`).emit(JOBS_UPDATED_EVENT, event);
    return;
  }

  io.to("jobs").emit(JOBS_UPDATED_EVENT, event);
};
