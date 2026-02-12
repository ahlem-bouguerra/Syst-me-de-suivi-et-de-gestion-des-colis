import { Router } from "express";
import { prisma } from "../db";
import { ParcelStatus, EventSource } from "@prisma/client";

export const cronRoutes = Router();

// 🔒 Middleware: تحقق من السر
function verifyCronSecret(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  const expectedSecret = process.env.CRON_SECRET || "your-secret-key-change-me";
  
  if (authHeader !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  
  next();
}

// ✅ POST /api/cron/check-sla
cronRoutes.post("/check-sla", verifyCronSecret, async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // 1️⃣ جيب الطرود النشطة القديمة (> 1 يوم)
    const activeParcels = await prisma.parcel.findMany({
      where: {
        status: {
          in: [ParcelStatus.OUTBOUND_SCANNED, ParcelStatus.IN_TRANSIT]
        },
        outboundScannedAt: {
          lt: oneDayAgo // أقدم من يوم واحد
        }
      },
      include: {
        carrier: true
      }
    });

    const results = {
      checked: activeParcels.length,
      updatedToPending: 0,
      updatedToLost: 0,
      errors: [] as string[]
    };

    // 2️⃣ حدث كل طرد حسب الـ SLA
    for (const parcel of activeParcels) {
      try {
        if (!parcel.outboundScannedAt || !parcel.carrier) {
          continue;
        }

        const daysSinceScan = Math.floor(
          (now.getTime() - parcel.outboundScannedAt.getTime()) / (24 * 60 * 60 * 1000)
        );

        const slaPending = parcel.carrier.slaPendingDays;
        const slaLost = parcel.carrier.slaLostDays;

        let newStatus: ParcelStatus | null = null;

        // 3️⃣ تحديد الحالة الجديدة
        if (daysSinceScan >= slaLost) {
          newStatus = ParcelStatus.LOST;
          results.updatedToLost++;
        } else if (daysSinceScan >= slaPending) {
          newStatus = ParcelStatus.PENDING_TOO_LONG;
          results.updatedToPending++;
        }

        // 4️⃣ تحديث إذا فيه تغيير
        if (newStatus && newStatus !== parcel.status) {
          const fromStatus = parcel.status;

          await prisma.parcel.update({
            where: { id: parcel.id },
            data: {
              status: newStatus,
              ...(newStatus === ParcelStatus.LOST && { lostAt: now })
            }
          });

          await prisma.parcelEvent.create({
            data: {
              parcelId: parcel.id,
              eventType: "SLA_CHECK",
              fromStatus,
              toStatus: newStatus,
              source: EventSource.SYSTEM,
              payload: {
                daysSinceScan,
                slaPending,
                slaLost,
                checkedAt: now.toISOString()
              }
            }
          });
        }
      } catch (error: any) {
        results.errors.push(`Parcel ${parcel.trackingNumber}: ${error?.message ?? "Unknown error"}`);
      }
    }

    return res.json({
      ok: true,
      timestamp: now.toISOString(),
      results
    });

  } catch (error: any) {
    console.error("❌ SLA Check Error:", error);
    return res.status(500).json({
      ok: false,
      message: error?.message ?? "Internal server error"
    });
  }
});

// 📊 GET /api/cron/stats (للتجربة)
cronRoutes.get("/stats", verifyCronSecret, async (req, res) => {
  const stats = await prisma.parcel.groupBy({
    by: ["status"],
    _count: true
  });

  const carrierStats = await prisma.carrier.findMany({
    select: {
      id: true,
      name: true,
      slaPendingDays: true,
      slaLostDays: true,
      _count: {
        select: { parcels: true }
      }
    }
  });

  return res.json({
    ok: true,
    parcelsByStatus: stats,
    carriers: carrierStats
  });
});