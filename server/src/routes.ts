import { Router } from "express";
import { parseOrThrow, quoteSchema } from "./schemas.js";
import { listSchemes, quoteAllPlans } from "./services/quoteService.js";

export const router = Router();

router.get("/loan-schemes", async (_req, res) => {
  res.json({ schemes: await listSchemes() });
});

router.post("/quotes", async (req, res) => {
  const body = parseOrThrow(quoteSchema, req.body);
  res.json(await quoteAllPlans(body));
});