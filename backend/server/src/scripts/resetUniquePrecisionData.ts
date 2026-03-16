import mongoose from "mongoose";
import dotenv from "dotenv";
import Job from "../models/Job";
import EmployeeLog from "../models/EmployeeLog";
import MasterConfig from "../models/MasterConfig";
import IdleTimeConfig from "../models/IdleTimeConfig";
import Counter from "../models/Counter";

dotenv.config();

const DEFAULT_URI =
  "mongodb+srv://admin:ZAQzaq%40123@cluster0.dwpgvyr.mongodb.net/unique_precision?retryWrites=true&w=majority";

const MONGO_URI = process.env.MONGO_URI || DEFAULT_URI;

const resetData = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not provided");
  }

  await mongoose.connect(MONGO_URI);
  try {
    const [jobs, logs, masters, idle, counters] = await Promise.all([
      Job.deleteMany({}),
      EmployeeLog.deleteMany({}),
      MasterConfig.deleteMany({}),
      IdleTimeConfig.deleteMany({}),
      Counter.deleteMany({}),
    ]);

    console.log("Reset complete:");
    console.log(`- jobs deleted: ${jobs.deletedCount ?? 0}`);
    console.log(`- employee logs deleted: ${logs.deletedCount ?? 0}`);
    console.log(`- master configs deleted: ${masters.deletedCount ?? 0}`);
    console.log(`- idle time configs deleted: ${idle.deletedCount ?? 0}`);
    console.log(`- counters deleted: ${counters.deletedCount ?? 0}`);
  } finally {
    await mongoose.disconnect();
  }
};

resetData()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to reset data:", error);
    process.exit(1);
  });
