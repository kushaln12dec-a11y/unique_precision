import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  groupId: {
    type: Number,
    required: true,
    index: true,
  },
  customer: {
    type: String,
    default: "",
  },
  rate: {
    type: String,
    default: "",
  },
  cut: {
    type: String,
    default: "",
  },
  thickness: {
    type: String,
    default: "",
  },
  passLevel: {
    type: String,
    default: "1",
  },
  setting: {
    type: String,
    default: "0",
  },
  qty: {
    type: String,
    default: "1",
  },
  sedm: {
    type: String,
    enum: ["Yes", "No"],
    default: "No",
  },
  sedmSelectionType: {
    type: String,
    enum: ["range", "standard"],
    default: "range",
  },
  sedmRangeKey: {
    type: String,
    default: "0.3-0.4",
  },
  sedmStandardValue: {
    type: String,
    default: "",
  },
  sedmLengthType: {
    type: String,
    enum: ["min", "per"],
    default: "min",
  },
  sedmOver20Length: {
    type: String,
    default: "",
  },
  sedmLengthValue: {
    type: String,
    default: "",
  },
  sedmHoles: {
    type: String,
    default: "1",
  },
  sedmEntriesJson: {
    type: String,
    default: "",
  },
  material: {
    type: String,
    default: "",
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Low",
  },
  description: {
    type: String,
    default: "",
  },
  cutImage: {
    type: String,
    default: null,
  },
  critical: {
    type: Boolean,
    default: false,
  },
  pipFinish: {
    type: Boolean,
    default: false,
  },
  totalHrs: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: String,
    default: "Unassigned",
  },
  refNumber: {
    type: String,
    default: "",
  },
  // Operator-specific fields
  startTime: {
    type: String,
    default: "",
  },
  endTime: {
    type: String,
    default: "",
  },
  machineHrs: {
    type: String,
    default: "",
  },
  machineNumber: {
    type: String,
    default: "",
  },
  opsName: {
    type: String,
    default: "",
  },
  idleTime: {
    type: String,
    default: "",
  },
  idleTimeDuration: {
    type: String,
    default: "",
  },
  lastImage: {
    type: String,
    default: null,
  },
  operatorCaptures: [{
    captureMode: {
      type: String,
      enum: ["SINGLE", "RANGE"],
      default: "SINGLE",
    },
    fromQty: {
      type: Number,
      required: true,
      min: 1,
    },
    toQty: {
      type: Number,
      required: true,
      min: 1,
    },
    quantityCount: {
      type: Number,
      required: true,
      min: 1,
    },
    startTime: {
      type: String,
      default: "",
    },
    endTime: {
      type: String,
      default: "",
    },
    machineHrs: {
      type: String,
      default: "",
    },
    machineNumber: {
      type: String,
      default: "",
    },
    opsName: {
      type: String,
      default: "",
    },
    idleTime: {
      type: String,
      default: "",
    },
    idleTimeDuration: {
      type: String,
      default: "",
    },
    lastImage: {
      type: String,
      default: null,
    },
    createdAt: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
      default: "",
    },
  }],
  quantityQaStates: {
    type: Map,
    of: String,
    default: {},
  },
  updatedBy: {
    type: String,
    default: "",
  },
  updatedAt: {
    type: String,
    default: "",
  },
}, {
  timestamps: false, // Disable automatic timestamps since we use custom createdAt string
});

export default mongoose.model("Job", jobSchema);
