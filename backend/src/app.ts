import express from "express";
import cors from "cors";
import { routes } from "./routes/index";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", routes);

const port = process.env.PORT ? Number(process.env.PORT) : 5000;
app.listen(port, () => console.log(`Backend running on :${port}`));
