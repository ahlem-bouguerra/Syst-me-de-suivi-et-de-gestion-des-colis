import { Router } from "express";
import { scanRoutes } from "./scan";
import { parcelsRoutes } from "./parcels"; // ✅
import { carriersRoutes } from "./carriers"; // ✅ جديد
import { cronRoutes } from "./cronRoutes"; // ✅ جديد

export const routes = Router();
routes.use("/scan", scanRoutes);

routes.use("/parcels", parcelsRoutes); // ✅
routes.use("/carriers", carriersRoutes); // ✅
routes.use("/cron", cronRoutes); // ✅



