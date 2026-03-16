import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { createAdminAndLogin, ensureEnv, resetDb } from "./testUtils";

jest.mock("../utils/objectStorage", () => ({
  resolveStoredFile: async (value: unknown) => {
    if (typeof value === "string" && value.startsWith("data:")) {
      return "https://example.com/mock-operator.png";
    }
    if (value === null || value === undefined || value === "") return null;
    return String(value);
  },
}));

describe("Operator API", () => {
  beforeAll(async () => {
    ensureEnv();
    await prisma.$connect();
  });

  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("updates machine details and converts lastImage to URL", async () => {
    const token = await createAdminAndLogin();

    const jobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        groupId: 999,
        customer: "UPC001",
        rate: "100",
        cut: "10",
        thickness: "20",
        passLevel: "1",
        setting: "0",
        qty: "2",
        sedm: "No",
        sedmSelectionType: "range",
        sedmRangeKey: "0.3-0.4",
        sedmStandardValue: "",
        sedmLengthType: "min",
        sedmOver20Length: "",
        sedmLengthValue: "",
        sedmHoles: "1",
        sedmEntriesJson: "",
        operationRowsJson: "",
        material: "SS",
        priority: "Low",
        description: "Operator job",
        programRefFile: "PRF-1",
        cutImage: "",
        critical: false,
        pipFinish: false,
        refNumber: "",
        totalHrs: 1,
        totalAmount: 100,
        createdAt: "16 Mar 2026 10:00",
        createdBy: "Tester",
        assignedTo: "Unassigned",
      });

    const jobId = jobRes.body._id;

    const updateRes = await request(app)
      .put(`/api/operator/jobs/${jobId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        machineNumber: "MC-01",
        opsName: "Operator One",
        lastImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2a3WQAAAABJRU5ErkJggg==",
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.machineNumber).toBe("MC-01");
    expect(updateRes.body.opsName).toBe("Operator One");
    expect(updateRes.body.lastImage).toBe("https://example.com/mock-operator.png");
  });
});
