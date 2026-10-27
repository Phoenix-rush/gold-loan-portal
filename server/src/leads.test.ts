import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";
import { app } from "./app.js";
import { prisma } from "./db.js";

const valid = {
  name: "Ravi Kumar",
  mobileNumber: "9876543210",
  netWeightGrams: 45,
  grossWeightGrams: 50,
  karat: 22,
  planId: "PLAN_EMI_01",
};

beforeAll(async () => {
  await prisma.lead.deleteMany(); // test DB saaf
});

describe("leads", () => {
  it("case 1: creates lead -> 201 with applicationId and server-computed loan", async () => {
    const res = await request(app).post("/api/v1/leads").send(valid);
    expect(res.status).toBe(201);
    expect(res.body.applicationId).toMatch(/^GL-\d+$/);
    expect(res.body.eligibleLoanRupees).toBe(216562);
    expect(res.body.status).toBe("SUBMITTED");
  });

  it("case 6: same mobile again -> 409 with existing applicationId", async () => {
    const first = await request(app).post("/api/v1/leads").send({ ...valid, mobileNumber: "9123456780" });
    const second = await request(app).post("/api/v1/leads").send({ ...valid, mobileNumber: "9123456780" });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("DUPLICATE_APPLICATION");
    expect(second.body.error.applicationId).toBe(first.body.applicationId);
  });

  it("case 5: invalid mobile -> 400 on mobileNumber", async () => {
    for (const mobileNumber of ["5876543210", "98765"]) {
      const res = await request(app).post("/api/v1/leads").send({ ...valid, mobileNumber });
      expect(res.status).toBe(400);
      expect(res.body.error.fields.map((f: any) => f.field)).toContain("mobileNumber");
    }
  });

  it("case 4: net > gross -> 400 on netWeightGrams", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...valid, mobileNumber: "9000000001", netWeightGrams: 52, grossWeightGrams: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe("netWeightGrams");
  });

  it("bad name -> 400 on name", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...valid, mobileNumber: "9000000002", name: "R4vi" });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe("name");
  });

  it("unknown plan -> 404", async () => {
    const res = await request(app)
      .post("/api/v1/leads")
      .send({ ...valid, mobileNumber: "9000000003", planId: "PLAN_FAKE" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("PLAN_NOT_FOUND");
  });

  it("GET /leads: newest first, mobile masked", async () => {
    const res = await request(app).get("/api/v1/leads");
    expect(res.status).toBe(200);
    expect(res.body.leads.length).toBeGreaterThan(0);
    for (const l of res.body.leads) {
      expect(l.mobileNumber).toMatch(/^\d{4}XXXX\d{2}$/);
    }
    const times = res.body.leads.map((l: any) => new Date(l.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});