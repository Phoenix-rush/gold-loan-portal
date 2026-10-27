import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const { app } = await import("./app.js");

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API on http://localhost:${port}`));