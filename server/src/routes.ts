import { Router } from "express";
import { parseOrThrow, quoteSchema, leadSchema  } from "./schemas.js";
import { listSchemes, quoteAllPlans } from "./services/quoteService.js";
import { createLead, listLeads } from "./services/leadService.js";
import { chatSchema, confirmSchema } from "./schemas.js";
import { runChat } from "./chat/chatService.js";
import { confirmPending } from "./chat/pending.js";


export const router = Router();

router.get("/loan-schemes", async (_req, res) => {
  res.json({ schemes: await listSchemes() });
});

router.post("/quotes", async (req, res) => {
  const body = parseOrThrow(quoteSchema, req.body);
  res.json(await quoteAllPlans(body));
});

router.post("/leads", async (req, res) => {
  const body = parseOrThrow(leadSchema, req.body);
  res.status(201).json(await createLead(body));
});

router.get("/leads", async (req, res) => {
  const planId = typeof req.query.planId === "string" ? req.query.planId : undefined;
  res.json({ leads: await listLeads(planId) });
});

router.post("/chat", async (req, res) => {
  const body = parseOrThrow(chatSchema, req.body);
  res.json(await runChat(body.messages));
});

router.post("/chat/confirm", async (req, res) => {
  const { pendingId } = parseOrThrow(confirmSchema, req.body);
  res.status(201).json(await confirmPending(pendingId));
});