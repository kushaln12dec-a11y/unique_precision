import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    default: ""
  },
  lastName: {
    type: String,
    default: ""
  },
  phone: {
    type: String,
    default: ""
  },
  empId: {
    type: String,
    unique: true,
    sparse: true
  },
  image: {
    type: String,
    default: ""
  },
  role: {
    type: String,
    enum: ["ADMIN", "PROGRAMMER", "OPERATOR", "QC"],
    default: "OPERATOR"
  }
}, {
  timestamps: true
});

export default mongoose.model("User", userSchema);
