import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const carrierAccountsRoutes = Router();

// GET /api/carrier-accounts?carrierId=1
carrierAccountsRoutes.get("/", async (req, res) => {
  const carrierId = req.query.carrierId ? Number(req.query.carrierId) : null;

  const where: any = {};
  if (carrierId) where.carrierId = carrierId;

  const accounts = await prisma.carrierAccount.findMany({
    where,
    orderBy: { id: "asc" },
    include: { carrier: true },
  });

  return res.json({ ok: true, accounts });
});

// POST /api/carrier-accounts
const accountSchema = z.object({
  carrierId: z.number(),
  accountName: z.string().min(2),
  externalId: z.string().min(1),
  apiKey: z.string().min(1),
  baseUrl: z.string().url(),
  isEnabled: z.boolean().optional(),
});

carrierAccountsRoutes.post("/", async (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, errors: parsed.error.flatten() });

  const acc = await prisma.carrierAccount.create({ data: parsed.data });
  return res.json({ ok: true, account: acc });
});

// PUT /api/carrier-accounts/:id
carrierAccountsRoutes.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "Invalid ID" });

  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, errors: parsed.error.flatten() });

  const acc = await prisma.carrierAccount.update({ where: { id }, data: parsed.data });
  return res.json({ ok: true, account: acc });
});

// PATCH /api/carrier-accounts/:id/toggle
carrierAccountsRoutes.patch("/:id/toggle", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "Invalid ID" });

  const acc = await prisma.carrierAccount.findUnique({ where: { id } });
  if (!acc) return res.status(404).json({ ok: false, message: "Not found" });

  const updated = await prisma.carrierAccount.update({
    where: { id },
    data: { isEnabled: !acc.isEnabled },
  });

  return res.json({ ok: true, account: updated });
});

// DELETE /api/carrier-accounts/:id
carrierAccountsRoutes.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "Invalid ID" });

  await prisma.carrierAccount.delete({ where: { id } });
  return res.json({ ok: true });
});
