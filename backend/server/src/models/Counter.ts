import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: false,
  }
);

export default mongoose.model("Counter", counterSchema);
