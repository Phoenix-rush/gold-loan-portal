import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import { router } from "./routes.js";
import { AppError } from "./errors.js";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1", router);

app.use((_req, res) => {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found", fields: [] },
  });
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, fields: err.fields, ...err.extra },
    });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "Malformed JSON body", fields: [] },
    });
  }
  console.error(err); // stack sirf server log mein
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Something went wrong", fields: [] },
  });
});