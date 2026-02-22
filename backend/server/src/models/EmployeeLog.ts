import mongoose from "mongoose";

const employeeLogSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["PROGRAMMER", "OPERATOR", "QC"],
      required: true,
      index: true,
    },
    activityType: {
      type: String,
      enum: ["PROGRAMMER_JOB_CREATION", "OPERATOR_PRODUCTION", "QA_REVIEW"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED"],
      default: "COMPLETED",
      index: true,
    },
    userId: {
      type: String,
      default: "",
      index: true,
    },
    userEmail: {
      type: String,
      default: "",
      index: true,
    },
    userName: {
      type: String,
      default: "",
      index: true,
    },
    jobGroupId: {
      type: Number,
      default: null,
      index: true,
    },
    jobId: {
      type: String,
      default: "",
      index: true,
    },
    refNumber: {
      type: String,
      default: "",
      index: true,
    },
    settingLabel: {
      type: String,
      default: "",
    },
    quantityFrom: {
      type: Number,
      default: null,
    },
    quantityTo: {
      type: Number,
      default: null,
    },
    quantityCount: {
      type: Number,
      default: null,
      index: true,
    },
    jobCustomer: {
      type: String,
      default: "",
      index: true,
    },
    jobDescription: {
      type: String,
      default: "",
    },
    workItemTitle: {
      type: String,
      default: "",
      index: true,
    },
    workSummary: {
      type: String,
      default: "",
    },
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("EmployeeLog", employeeLogSchema);
