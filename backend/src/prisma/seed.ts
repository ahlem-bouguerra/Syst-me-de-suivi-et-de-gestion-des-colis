import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // إضافة شركات الشحن الافتراضية
  const carriers = [
    {
      name: "DHL Express",
      ruleType: "PREFIX",
      ruleValue: "DHL",
      slaPendingDays: 7,
      slaLostDays: 15
    },
    {
      name: "Aramex",
      ruleType: "PREFIX",
      ruleValue: "ARX",
      slaPendingDays: 10,
      slaLostDays: 20
    },
    {
      name: "Poste Tunisienne",
      ruleType: "REGEX",
      ruleValue: "^PT\\d+$",
      slaPendingDays: 14,
      slaLostDays: 30
    },
    {
      name: "FedEx",
      ruleType: "PREFIX",
      ruleValue: "FDX",
      slaPendingDays: 7,
      slaLostDays: 15
    },
    {
      name: "UPS",
      ruleType: "PREFIX",
      ruleValue: "UPS",
      slaPendingDays: 7,
      slaLostDays: 15
    }
  ];

  for (const carrier of carriers) {
    const existing = await prisma.carrier.findUnique({
      where: { name: carrier.name }
    });

    if (!existing) {
      await prisma.carrier.create({ data: carrier });
      console.log(`✅ Created carrier: ${carrier.name}`);
    } else {
      console.log(`⏭️  Carrier already exists: ${carrier.name}`);
    }
  }

  console.log("✅ Seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });