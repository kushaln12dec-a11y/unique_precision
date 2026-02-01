import mongoose from "mongoose";

const idleTimeConfigSchema = new mongoose.Schema({
  idleTimeType: {
    type: String,
    required: true,
    unique: true,
    enum: ["Power Break", "Machine Breakdown", "Vertical Dial", "Cleaning", "Consumables Change"],
  },
  durationMinutes: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.model("IdleTimeConfig", idleTimeConfigSchema);
