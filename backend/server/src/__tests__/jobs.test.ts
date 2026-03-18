import request from "supertest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { createAdminAndLogin, ensureEnv, resetDb } from "./testUtils";

jest.mock("../utils/objectStorage", () => ({
  resolveStoredFile: async (value: unknown) => {
    if (typeof value === "string" && value.startsWith("data:")) {
      return "https://example.com/mock-image.png";
    }
    if (value === null || value === undefined || value === "") return null;
    return String(value);
  },
}));

describe("Jobs API", () => {
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

  it("creates a job and preserves response shape", async () => {
    const token = await createAdminAndLogin();

    const payload = {
      groupId: 12345,
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
      description: "Test job",
      programRefFile: "PRF-1",
      cutImage: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+X2a3WQAAAABJRU5ErkJggg==",
      critical: false,
      pipFinish: false,
      refNumber: "",
      totalHrs: 1,
      totalAmount: 100,
      createdAt: "16 Mar 2026 10:00",
      createdBy: "Tester",
      assignedTo: "Unassigned",
    };

    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body.groupId).toBe("12345");
    expect(res.body.cutImage).toBe("https://example.com/mock-image.png");
    expect(res.body.refNumber).toMatch(/^JOB-\d{5}$/);
    expect(typeof res.body.createdAt).toBe("string");
  });

  it("creates multiple jobs as a single order (group) and returns array", async () => {
    const token = await createAdminAndLogin();

    const base = {
      groupId: 777,
      customer: "UPC002",
      rate: "150",
      cut: "5",
      thickness: "10",
      passLevel: "1",
      setting: "0",
      qty: "1",
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
      priority: "Medium",
      description: "Order job",
      programRefFile: "PRF-2",
      cutImage: "",
      critical: false,
      pipFinish: false,
      refNumber: "",
      totalHrs: 2,
      totalAmount: 300,
      createdAt: "16 Mar 2026 10:30",
      createdBy: "Tester",
      assignedTo: "Unassigned",
    };

    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send([base, { ...base, cut: "7" }]);

    expect(res.status).toBe(201);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].refNumber).toBe(res.body[1].refNumber);
  });
});
