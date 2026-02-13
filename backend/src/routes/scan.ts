import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { ParcelStatus, EventSource } from "@prisma/client";
import { colisExpressGetParcel } from "../services/colisExpressClient";


export const scanRoutes = Router();

const outboundSchema = z.object({
  trackingNumber: z.string().min(3),
  destination: z.string().optional(),
  userId: z.string().optional()
});

function digitsOnly(s: string) {
  return /^\d+$/.test(s);
}

async function detectCarriersByLength(tracking: string) {
  if (!digitsOnly(tracking)) return [];

  const carriers = await prisma.carrier.findMany({
    where: { ruleType: "LENGTH" },
    orderBy: { id: "asc" },
  });

  return carriers.filter((c) => {
    const expectedLen = Number(c.ruleValue);
    return Number.isFinite(expectedLen) && tracking.length === expectedLen;
  });
}


async function getParcelFromCarrierApi(
  carrierName: string,
  acc: { baseUrl: string; externalId: string; apiKey: string },
  tracking: string
): Promise<{ ok: boolean; data?: any }> {
  switch (carrierName) {
    case "ColisExpress": {
      const r = await colisExpressGetParcel(
        { baseUrl: acc.baseUrl, externalId: acc.externalId, apiKey: acc.apiKey },
        tracking
      );

      // ✅ شرط النجاح ل ColisExpress (مثال: يرجع libelle)
      if (r.json && typeof r.json === "object" && r.json.libelle) {
        return { ok: true, data: r.json };
      }
      return { ok: false };
    }

    // غدوة تزيد:
    // case "BigBoss":
    //   const r2 = await bigBossGetParcel(...)
    //   if (...) return { ok: true, data: r2 }
    //   return { ok: false }

    default:
      // الشركة ما عندهاش API client في السيستام توا
      return { ok: false };
  }
}


/**
 * ✅ Clean generic:
 * - نحدد Carrier بالـ LENGTH
 * - إذا عندو accounts => نجرب API على كل account
 */
async function detectCarrierAndAccount(tracking: string) {
  const candidates = await detectCarriersByLength(tracking);
  if (candidates.length === 0) return null;

  // 1) جرّب API أولاً لأي carrier عندو accounts
  for (const carrier of candidates) {
    const accounts = await prisma.carrierAccount.findMany({
      where: { carrierId: carrier.id, isEnabled: true },
      orderBy: { id: "asc" },
    });

    for (const acc of accounts) {
      const apiResult = await getParcelFromCarrierApi(carrier.name, acc, tracking);
      if (apiResult?.ok) return { carrier, account: acc, apiResponse: apiResult.data };
    }
  }

  // 2) إذا ما نجح حتى API: رجّع أول Carrier كـ fallback
  return { carrier: candidates[0], account: null, apiResponse: null };
}


scanRoutes.post("/outbound", async (req, res) => {
  const parsed = outboundSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, errors: parsed.error.flatten() });

  const { trackingNumber, destination, userId } = parsed.data;

  // ✅ CLEAN: carrier + account (if matched via API)
  const hit = await detectCarrierAndAccount(trackingNumber);
  const carrier = hit?.carrier ?? null;

  const existing = await prisma.parcel.findUnique({ where: { trackingNumber } });
  const fromStatus = existing?.status ?? null;

  const apiDestination =
  hit?.apiResponse?.ville  // بدّل "ville" بالمفتاح الصحيح في JSON متاع ColisExpress
  ?? hit?.apiResponse?.adresse
  ?? null;

  const finalDestination = destination ?? apiDestination ?? null;

  const parcel = await prisma.parcel.upsert({
    where: { trackingNumber },
    create: {
      trackingNumber,
      destination: finalDestination,
      carrierId: carrier?.id ?? null,
      carrierAccountId: hit?.account?.id ?? null,
      status: ParcelStatus.OUTBOUND_SCANNED,
      outboundScannedAt: new Date(),
    },
    update: {
      destination: finalDestination,
      carrierId: carrier?.id ?? existing?.carrierId ?? null,
      carrierAccountId: hit?.account?.id ?? existing?.carrierAccountId ?? null,
      status: ParcelStatus.OUTBOUND_SCANNED,
      outboundScannedAt: existing?.outboundScannedAt ?? new Date(),
    },
  });

  await prisma.parcelEvent.create({
    data: {
      parcelId: parcel.id,
      eventType: "SCAN_OUT",
      fromStatus: (fromStatus as any) ?? null,
      toStatus: ParcelStatus.OUTBOUND_SCANNED,
      source: EventSource.SCAN,
      userId: userId ?? null,
      payload: {
        destination: finalDestination,
        carrierDetected: carrier?.name ?? null,
        accountDetected: hit?.account?.accountName ?? null,
        apiMatched: !!hit?.account,
        apiResponse: hit?.apiResponse ?? null,
      },
    },
  });

  return res.json({ ok: true, parcel, detection: hit });
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



