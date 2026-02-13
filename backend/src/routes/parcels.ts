import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { ParcelStatus, EventSource } from "@prisma/client";

export const parcelsRoutes = Router();

// ✅ schema قبل الاستعمال
const bulkUpdateSchema = z.object({
  updates: z.array(
    z.object({
      trackingNumber: z.string().min(1),
      status: z.nativeEnum(ParcelStatus),
      note: z.string().optional(),
    })
  ),
  userId: z.string().optional(),
});

// GET /api/parcels?status=RETURN_RECEIVED&limit=20
parcelsRoutes.get("/", async (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 20;

  const statusParam = req.query.status as string | undefined;
  const where: any = {};

  if (statusParam) {
    if (!Object.values(ParcelStatus).includes(statusParam as ParcelStatus)) {
      return res.status(400).json({ ok: false, message: "Invalid status filter" });
    }
    where.status = statusParam as ParcelStatus;
  }

  const parcels = await prisma.parcel.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
    include: { carrier: true },
  });

  return res.json({ ok: true, parcels });
});


// PATCH /api/parcels/:id/status
parcelsRoutes.patch("/:id/status", async (req, res) => {
  const parcelId = parseInt(req.params.id);
  if (isNaN(parcelId)) {
    return res.status(400).json({ ok: false, message: "Invalid parcel ID" });
  }

  const schema = z.object({
    status: z.nativeEnum(ParcelStatus),
    note: z.string().optional(),
    userId: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Validation error",
      errors: parsed.error.flatten(),
    });
  }

  const { status, note, userId } = parsed.data;

  try {
    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
    });

    if (!parcel) {
      return res.status(404).json({ ok: false, message: "Parcel not found" });
    }

    const fromStatus = parcel.status;

    const updatedParcel = await prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status,
        ...(status === ParcelStatus.DELIVERED && { deliveredAt: new Date() }),
        ...(status === ParcelStatus.LOST && { lostAt: new Date() }),
      },
      include: { carrier: true },
    });

    await prisma.parcelEvent.create({
      data: {
        parcelId: parcel.id,
        eventType: "STATUS_UPDATE",
        fromStatus,
        toStatus: status,
        source: EventSource.MANUAL,
        userId: userId || null,
        payload: note ? { note } : null,
      },
    });

    return res.json({ ok: true, parcel: updatedParcel });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      message: error?.message ?? "Unknown error",
    });
  }
});

// ✅ POST /api/parcels/bulk-update
parcelsRoutes.post("/bulk-update", async (req, res) => {
  const parsed = bulkUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: "Erreur de validation",
      errors: parsed.error.flatten(),
    });
  }

  const { updates, userId } = parsed.data;

  const results = {
    success: [] as string[],
    failed: [] as { trackingNumber: string; reason: string }[],
  };

  for (const update of updates) {
    try {
      const parcel = await prisma.parcel.findUnique({
        where: { trackingNumber: update.trackingNumber },
      });

      if (!parcel) {
        results.failed.push({ trackingNumber: update.trackingNumber, reason: "Parcel not found" });
        continue;
      }

      const fromStatus = parcel.status;

      await prisma.parcel.update({
        where: { id: parcel.id },
        data: {
          status: update.status,
          ...(update.status === ParcelStatus.DELIVERED && { deliveredAt: new Date() }),
          ...(update.status === ParcelStatus.LOST && { lostAt: new Date() }),
        },
      });

      await prisma.parcelEvent.create({
        data: {
          parcelId: parcel.id,
          eventType: "STATUS_UPDATE",
          fromStatus,
          toStatus: update.status,
          source: EventSource.BULK_IMPORT,
          userId: userId || null,
          payload: update.note ? { note: update.note } : null,
        },
      });

      results.success.push(update.trackingNumber);
    } catch (error: any) {
      results.failed.push({
        trackingNumber: update.trackingNumber,
        reason: error?.message ?? "Unknown error",
      });
    }
  }

  return res.json({
    ok: true,
    summary: {
      total: updates.length,
      success: results.success.length,
      failed: results.failed.length,
    },
    results,
  });
});

// GET /api/parcels/:trackingNumber
parcelsRoutes.get("/:trackingNumber", async (req, res) => {
  const schema = z.object({ trackingNumber: z.string().min(3) });
  const parsed = schema.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ ok: false, errors: parsed.error.flatten() });

  const { trackingNumber } = parsed.data;

  const parcel = await prisma.parcel.findUnique({
    where: { trackingNumber },
    include: {
      carrier: true,
      carrierAccount: true,
      events: { orderBy: { createdAt: "desc" } },
      returns: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!parcel) return res.status(404).json({ ok: false, message: "Parcel not found" });
  return res.json({ ok: true, parcel });
});

// ✅ إذا تحتاج id route:
parcelsRoutes.get("/by-id/:id", async (req, res) => {
  const parcelId = parseInt(req.params.id);
  if (isNaN(parcelId)) return res.status(400).json({ ok: false, message: "Invalid parcel ID" });

  const parcel = await prisma.parcel.findUnique({
    where: { id: parcelId },
    include: { carrier: true, events: { orderBy: { createdAt: "desc" } }, returnIntake: true },
  });

  if (!parcel) return res.status(404).json({ ok: false, message: "Parcel not found" });
  return res.json({ ok: true, parcel });
});


