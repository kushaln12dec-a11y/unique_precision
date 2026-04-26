import { createServer } from "http";
import { connectDB } from "./config/database";
import { loadEnv } from "./config/env";
import { initDB } from "./config/initDB";
import app from "./app";
import { initSocketServer } from "./lib/socket";

loadEnv();

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  const dbOk = await connectDB();
  if (!dbOk) {
    console.warn("Database connection not established. Server will still start for health checks.");
  } else {
    await initDB();
  }

  const httpServer = createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? "Set" : "NOT SET - Login will fail!"}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "NOT SET"}`);
  });

  httpServer.on("error", (error) => {
    console.error("Server listen error:", error);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
