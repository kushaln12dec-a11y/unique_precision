import { rebalanceOperatorRevenueForJob } from "../routes/operatorShared";

describe("rebalanceOperatorRevenueForJob", () => {
  it("splits revenue by actual worked time and preserves per-log worked seconds", async () => {
    const updates = new Map<string, any>();
    const tx = {
      employeeLog: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "log-1",
            startedAt: new Date("2026-05-03T06:30:00.000Z"),
            endedAt: new Date("2026-05-03T06:30:50.000Z"),
            durationSeconds: 50,
            quantityFrom: 1,
            quantityTo: 1,
            quantityCount: 1,
            metadata: {
              workedSeconds: 50,
            },
          },
          {
            id: "log-2",
            startedAt: new Date("2026-05-03T06:31:00.000Z"),
            endedAt: new Date("2026-05-03T06:31:14.000Z"),
            durationSeconds: 14,
            quantityFrom: 1,
            quantityTo: 1,
            quantityCount: 1,
            metadata: {
              workedSeconds: 14,
            },
          },
        ]),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          updates.set(String(where.id), data);
          return { id: where.id, ...data };
        }),
      },
    };

    await rebalanceOperatorRevenueForJob(tx, {
      id: "job-1",
      qty: 1,
      totalHrs: 0.016,
      rate: 625,
    });

    expect(tx.employeeLog.findMany).toHaveBeenCalled();
    expect(tx.employeeLog.update).toHaveBeenCalledTimes(2);

    const firstUpdate = updates.get("log-1");
    const secondUpdate = updates.get("log-2");

    expect(firstUpdate.durationSeconds).toBe(50);
    expect(secondUpdate.durationSeconds).toBe(14);
    expect(firstUpdate.metadata.workedSeconds).toBe(50);
    expect(secondUpdate.metadata.workedSeconds).toBe(14);

    expect(firstUpdate.metadata.revenueByQuantity["1"]).toBe(7.81);
    expect(secondUpdate.metadata.revenueByQuantity["1"]).toBe(2.19);
    expect(firstUpdate.metadata.revenue).toBe(7.81);
    expect(secondUpdate.metadata.revenue).toBe(2.19);

    expect(firstUpdate.metadata.overtimeSeconds).toBeCloseTo(3.125, 3);
    expect(secondUpdate.metadata.overtimeSeconds).toBeCloseTo(0.875, 3);
    expect(firstUpdate.metadata.quantityRevenueModel).toBe("WEDM_PROPORTIONAL_TIME_SPLIT");
    expect(firstUpdate.metadata.revenueCapMode).toBe("PROPORTIONAL_ACTUAL_TIME");
  });
});
