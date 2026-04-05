/**
 * Standalone sync script — spustiteľný nezávisle od Next.js servera.
 * Vhodný pre spustenie cez Railway cron, GitHub Actions, alebo manuálne.
 *
 * Spustenie:
 *   npx tsx scripts/sync.ts
 *
 * Vyžaduje DATABASE_URL v .env
 */

import "dotenv/config";
import { runFullSync } from "../src/lib/sync";

async function main() {
  console.log("=== Standalone Sync Script ===");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":***@")}`);
  console.log("");

  try {
    const result = await runFullSync();

    console.log("\n=== Sync Summary ===");
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${(result.duration / 1000 / 60).toFixed(1)} minutes`);
    console.log("Results:", JSON.stringify(result.results, null, 2));

    if (result.errors.length > 0) {
      console.error("Errors:", result.errors);
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error("Fatal sync error:", error);
    process.exit(1);
  }
}

main();
