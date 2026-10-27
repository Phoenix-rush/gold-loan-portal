import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "./app.js";

describe("health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
  });
});