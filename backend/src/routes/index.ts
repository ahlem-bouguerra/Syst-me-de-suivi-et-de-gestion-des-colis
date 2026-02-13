import { Router } from "express";
import { scanRoutes } from "./scan";
import { parcelsRoutes } from "./parcels"; // ✅
import { carriersRoutes } from "./carriers"; // ✅ جديد
import { cronRoutes } from "./cronRoutes"; // ✅ جديد
import { carrierAccountsRoutes } from "./carrierAccounts";

export const routes = Router();
routes.use("/scan", scanRoutes);

routes.use("/parcels", parcelsRoutes); // ✅
routes.use("/carriers", carriersRoutes); // ✅
routes.use("/cron", cronRoutes); // ✅
routes.use("/carrier-accounts", carrierAccountsRoutes);



