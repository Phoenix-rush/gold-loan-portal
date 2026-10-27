import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "./app.js";

describe("GET /loan-schemes", () => {
  it("returns the 2 seeded plans", async () => {
    const res = await request(app).get("/api/v1/loan-schemes");
    expect(res.status).toBe(200);
    expect(res.body.schemes.map((s: any) => s.id)).toEqual(["PLAN_BULLET_01", "PLAN_EMI_01"]);
  });
});

describe("POST /quotes", () => {
  it("case 1 & 2: 45g 22K", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ netWeightGrams: 45, grossWeightGrams: 50, karat: 22 });
    expect(res.status).toBe(200);
    expect(res.body.pureGoldGrams).toBe(41.25);
    expect(res.body.goldValueRupees).toBe(288750);
    const byId = Object.fromEntries(res.body.plans.map((p: any) => [p.planId, p.eligibleLoanRupees]));
    expect(byId.PLAN_EMI_01).toBe(216562);
    expect(byId.PLAN_BULLET_01).toBe(202125);
  });

  it("case 4: net > gross -> 400 on netWeightGrams", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ netWeightGrams: 52, grossWeightGrams: 50, karat: 22 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields[0].field).toBe("netWeightGrams");
  });

  it("invalid karat -> 400 on karat", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .send({ netWeightGrams: 10, grossWeightGrams: 12, karat: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].field).toBe("karat");
  });

  it("malformed JSON -> 400 JSON error", async () => {
    const res = await request(app)
      .post("/api/v1/quotes")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});