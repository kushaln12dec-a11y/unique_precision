import dotenv from "dotenv";
import { connectDB } from "./config/database";
import app from "./app";

dotenv.config();

const PORT = process.env.PORT || 5000;

// PostgreSQL connection
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? "Set" : "NOT SET - Login will fail!"}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? "Set" : "NOT SET"}`);
});
