import express from "express";
import cors from "cors";

export const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));