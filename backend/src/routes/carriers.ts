import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const carriersRoutes = Router();

// GET /api/carriers - جلب كل شركات الشحن
carriersRoutes.get("/", async (req, res) => {
  try {
    const carriers = await prisma.carrier.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { parcels: true }
        }
      }
    });
    return res.json({ ok: true, carriers });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// GET /api/carriers/:id - جلب شركة واحدة
carriersRoutes.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: "Invalid ID" });

    const carrier = await prisma.carrier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { parcels: true, importBatches: true }
        }
      }
    });

    if (!carrier) return res.status(404).json({ ok: false, message: "Carrier not found" });
    
    return res.json({ ok: true, carrier });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// POST /api/carriers - إضافة شركة جديدة
const carrierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  ruleType: z.enum(["PREFIX", "REGEX"], {
    errorMap: () => ({ message: "Rule type must be PREFIX or REGEX" })
  }),
  ruleValue: z.string().min(1, "Rule value is required"),
  slaPendingDays: z.number().min(1).max(365).default(10),
  slaLostDays: z.number().min(1).max(365).default(20)
});

carriersRoutes.post("/", async (req, res) => {
  const parsed = carrierSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ 
      ok: false, 
      errors: parsed.error.flatten() 
    });
  }

  try {
    // التحقق من أن الاسم غير مكرر
    const existing = await prisma.carrier.findUnique({
      where: { name: parsed.data.name }
    });

    if (existing) {
      return res.status(400).json({ 
        ok: false, 
        message: "Carrier with this name already exists" 
      });
    }

    // التحقق من أن slaLostDays أكبر من slaPendingDays
    if (parsed.data.slaLostDays <= parsed.data.slaPendingDays) {
      return res.status(400).json({
        ok: false,
        message: "SLA Lost Days must be greater than SLA Pending Days"
      });
    }

    const carrier = await prisma.carrier.create({ 
      data: parsed.data 
    });

    return res.json({ ok: true, carrier });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// PUT /api/carriers/:id - تعديل شركة
carriersRoutes.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "Invalid ID" });

  const parsed = carrierSchema.safeParse(req.body);
  
  if (!parsed.success) {
    return res.status(400).json({ 
      ok: false, 
      errors: parsed.error.flatten() 
    });
  }

  try {
    // التحقق من أن الشركة موجودة
    const existing = await prisma.carrier.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ ok: false, message: "Carrier not found" });
    }

    // التحقق من أن الاسم غير مكرر (إذا تم تغييره)
    if (parsed.data.name !== existing.name) {
      const nameExists = await prisma.carrier.findUnique({
        where: { name: parsed.data.name }
      });
      if (nameExists) {
        return res.status(400).json({ 
          ok: false, 
          message: "Carrier with this name already exists" 
        });
      }
    }

    // التحقق من أن slaLostDays أكبر من slaPendingDays
    if (parsed.data.slaLostDays <= parsed.data.slaPendingDays) {
      return res.status(400).json({
        ok: false,
        message: "SLA Lost Days must be greater than SLA Pending Days"
      });
    }

    const carrier = await prisma.carrier.update({
      where: { id },
      data: parsed.data
    });

    return res.json({ ok: true, carrier });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

// DELETE /api/carriers/:id - حذف شركة
carriersRoutes.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ ok: false, message: "Invalid ID" });

  try {
    // التحقق من وجود الشركة
    const carrier = await prisma.carrier.findUnique({
      where: { id },
      include: {
        _count: { select: { parcels: true } }
      }
    });

    if (!carrier) {
      return res.status(404).json({ ok: false, message: "Carrier not found" });
    }

    // منع الحذف إذا كان هناك طرود مرتبطة
    if (carrier._count.parcels > 0) {
      return res.status(400).json({
        ok: false,
        message: `Cannot delete carrier. ${carrier._count.parcels} parcels are linked to it.`
      });
    }

    await prisma.carrier.delete({ where: { id } });

    return res.json({ ok: true, message: "Carrier deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});