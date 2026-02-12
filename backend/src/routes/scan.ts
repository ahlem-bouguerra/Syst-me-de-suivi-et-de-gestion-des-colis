import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { ParcelStatus, EventSource } from "@prisma/client";

export const scanRoutes = Router();

const outboundSchema = z.object({
  trackingNumber: z.string().min(3),
  destination: z.string().optional(),
  userId: z.string().optional()
});

// Carrier match by PREFIX/REGEX
async function detectCarrier(tracking: string) {
  const carriers = await prisma.carrier.findMany();
  for (const c of carriers) {
    if (c.ruleType === "PREFIX" && tracking.startsWith(c.ruleValue)) return c;
    if (c.ruleType === "REGEX") {
      const re = new RegExp(c.ruleValue);
      if (re.test(tracking)) return c;
    }
  }
  return null;
}

scanRoutes.post("/outbound", async (req, res) => {
  const parsed = outboundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, errors: parsed.error.flatten() });

  const { trackingNumber, destination, userId } = parsed.data;

  const carrier = await detectCarrier(trackingNumber);

  const existing = await prisma.parcel.findUnique({ where: { trackingNumber } });
  const fromStatus = existing?.status ?? null;

  const parcel = await prisma.parcel.upsert({
    where: { trackingNumber },
    create: {
      trackingNumber,
      destination,
      carrierId: carrier?.id ?? null,
      status: ParcelStatus.OUTBOUND_SCANNED,
      outboundScannedAt: new Date()
    },
    update: {
      destination: destination ?? existing?.destination ?? null,
      carrierId: carrier?.id ?? existing?.carrierId ?? null,
      status: ParcelStatus.OUTBOUND_SCANNED,
      outboundScannedAt: existing?.outboundScannedAt ?? new Date()
    }
  });

  await prisma.parcelEvent.create({
    data: {
      parcelId: parcel.id,
      eventType: "SCAN_OUT",
      fromStatus: (fromStatus as any) ?? null,
      toStatus: ParcelStatus.OUTBOUND_SCANNED,
      source: EventSource.SCAN,
      userId: userId ?? null,
      payload: { destination, carrierDetected: carrier?.name ?? null }
    }
  });

  return res.json({ ok: true, parcel });
});


// بعد endpoint outbound، أضف:

const returnSchema = z.object({
  trackingNumber: z.string().min(3),
  receivedBy: z.string().optional(),
  location: z.string().optional(),
  note: z.string().optional()
});

scanRoutes.post("/return", async (req, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ 
      ok: false, 
      errors: parsed.error.flatten() 
    });
  }

  const { trackingNumber, receivedBy, location, note } = parsed.data;

  // البحث عن الطرد
  const parcel = await prisma.parcel.findUnique({ 
    where: { trackingNumber },
    include: { carrier: true }
  });

  if (!parcel) {
    return res.status(404).json({ 
      ok: false, 
      message: "Parcel not found" 
    });
  }

  const fromStatus = parcel.status;

  // تحديث حالة الطرد
  const updated = await prisma.parcel.update({
    where: { id: parcel.id },
    data: {
      status: ParcelStatus.RETURN_RECEIVED,
      returnReceivedAt: new Date()
    },
    include: { carrier: true }
  });

  // تسجيل الاستلام
  await prisma.returnIntake.create({
    data: {
      parcelId: parcel.id,
      receivedBy: receivedBy || null,
      location: location || null,
      note: note || null
    }
  });

  // Event Log
  await prisma.parcelEvent.create({
    data: {
      parcelId: parcel.id,
      eventType: "SCAN_RETURN",
      fromStatus,
      toStatus: ParcelStatus.RETURN_RECEIVED,
      source: EventSource.SCAN,
      userId: receivedBy || null,
      payload: { location, note }
    }
  });

  return res.json({ ok: true, parcel: updated });
});
