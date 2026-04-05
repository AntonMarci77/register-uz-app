/**
 * Diagnostický skript — overí stav databázy a skúsi zapísať testovacie dáta
 * Spustenie: npx tsx scripts/check-db.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("=== Database Diagnostics ===\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set!");
    return;
  }
  console.log(`DATABASE_URL: ${dbUrl.replace(/:[^:@]+@/, ":***@")}`);

  let prisma: PrismaClient;
  try {
    const adapter = new PrismaPg({ connectionString: dbUrl });
    prisma = new PrismaClient({ adapter });
    console.log("Prisma client created OK\n");
  } catch (err) {
    console.error("Failed to create Prisma client:", err);
    return;
  }

  // 1. Check existing counts
  console.log("--- Current record counts ---");
  try {
    const counts = await Promise.all([
      prisma.pravnaForma.count().then((c) => ({ table: "PravnaForma", count: c })),
      prisma.skNace.count().then((c) => ({ table: "SkNace", count: c })),
      prisma.druhVlastnictva.count().then((c) => ({ table: "DruhVlastnictva", count: c })),
      prisma.velkostOrganizacie.count().then((c) => ({ table: "VelkostOrganizacie", count: c })),
      prisma.kraj.count().then((c) => ({ table: "Kraj", count: c })),
      prisma.okres.count().then((c) => ({ table: "Okres", count: c })),
      prisma.sidlo.count().then((c) => ({ table: "Sidlo", count: c })),
      prisma.reportTemplate.count().then((c) => ({ table: "ReportTemplate", count: c })),
      prisma.accountingEntity.count().then((c) => ({ table: "AccountingEntity", count: c })),
      prisma.financialStatement.count().then((c) => ({ table: "FinancialStatement", count: c })),
    ]);

    for (const { table, count } of counts) {
      console.log(`  ${table}: ${count}`);
    }
  } catch (err) {
    console.error("Failed to count records:", err);
  }

  // 2. Try to write and read a test record
  console.log("\n--- Write test ---");
  try {
    const testKraj = await prisma.kraj.upsert({
      where: { kod: "__TEST__" },
      create: { kod: "__TEST__", nazov: { sk: "Test Kraj" } },
      update: { nazov: { sk: "Test Kraj Updated" } },
    });
    console.log(`  Upsert Kraj OK: ${JSON.stringify(testKraj)}`);

    const readBack = await prisma.kraj.findUnique({ where: { kod: "__TEST__" } });
    console.log(`  Read back OK: ${JSON.stringify(readBack)}`);

    // Clean up
    await prisma.kraj.delete({ where: { kod: "__TEST__" } });
    console.log("  Delete OK — database write/read works!\n");
  } catch (err) {
    console.error("  Write test FAILED:", err);
  }

  // 3. Try to manually sync just kraje from API
  console.log("--- Manual kraje sync test ---");
  try {
    const res = await fetch("https://www.registeruz.sk/cruz-public/api/kraje", {
      headers: { Accept: "application/json" },
    });
    const data = await res.json();
    console.log(`  API returned ${data.lokacie?.length ?? 0} kraje`);

    if (data.lokacie && data.lokacie.length > 0) {
      let synced = 0;
      for (const item of data.lokacie) {
        try {
          await prisma.kraj.upsert({
            where: { kod: item.kod },
            create: { kod: item.kod, nazov: item.nazov },
            update: { nazov: item.nazov },
          });
          synced++;
        } catch (itemErr) {
          console.error(`  Failed to upsert kraj ${item.kod}:`, itemErr);
        }
      }
      console.log(`  Synced ${synced}/${data.lokacie.length} kraje`);

      // Verify
      const count = await prisma.kraj.count();
      console.log(`  Kraj count after sync: ${count}`);
    }
  } catch (err) {
    console.error("  Manual sync FAILED:", err);
  }

  await prisma.$disconnect();
  console.log("\n=== Done ===");
}

main().catch(console.error);
