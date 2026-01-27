const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://admin:ZAQzaq%40123@cluster0.dwpgvyr.mongodb.net/unique_precision?retryWrites=true&w=majority";

const ADMIN_EMAIL = "kushal12dec@gmail.com";
const ADMIN_PAYLOAD = {
  email: ADMIN_EMAIL,
  password: "$2b$10$1Tt46NEctpQp3St5R5rmFuWM2ZwhY3rnf7p0v3cf.JcA5gSOA03BW",
  firstName: "Kushal",
  lastName: "N",
  phone: "9632998952",
  empId: "EMP001",
  role: "ADMIN",
  image: ""
};

const seedAdmin = async () => {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not provided");
  }

  const connection = await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000
  });

  try {
    const { upsertedCount, modifiedCount } = await connection.connection
      .collection("users")
      .updateOne(
        { email: ADMIN_EMAIL },
        { $set: ADMIN_PAYLOAD },
        { upsert: true }
      );

    if (upsertedCount) {
      console.log("Admin user created (upserted).");
    } else if (modifiedCount) {
      console.log("Admin user updated.");
    } else {
      console.log("Admin user already exists with the same data.");
    }
  } finally {
    await connection.disconnect();
  }
};

seedAdmin().catch((error) => {
  console.error("Failed to seed admin user:", error);
  process.exit(1);
});
