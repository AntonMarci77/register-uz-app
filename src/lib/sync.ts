/**
 * Synchronizačný modul pre Register Účtovných Závierok
 * Synchronizuje dáta z RÚZ Open API do PostgreSQL databázy cez Prisma
 *
 * Optimalizácia v3:
 * - Raw SQL bulk INSERT ... ON CONFLICT (namiesto individuálnych Prisma upsert)
 * - Vysoká concurrency (50 súbežných HTTP requestov)
 * - Veľké dávky (200 záznamov per SQL statement)
 * - Preskočenie existujúcich ID pri prvom syncu
 */

import { prisma } from "./db";
import {
  getCodebook,
  getAllTemplates,
  getAllIds,
  getAccountingEntity,
  getFinancialStatement,
  getFinancialReport,
  getAnnualReport,
  AccountingEntityDetail,
  FinancialStatementDetail,
  FinancialReportDetail,
  AnnualReportDetail,
} from "./ruz-api";

// ============================================================
// Konfigurácia
// ============================================================

const INITIAL_SYNC_DATE = "2009-01-01";
/** Počet súbežných HTTP requestov na API */
const CONCURRENT_REQUESTS = 50;
/** Veľkosť dávky pre DB zápisy (bulk SQL) */
const DB_BATCH_SIZE = 200;
/** Interval logovania progressu (v záznamoch) */
const LOG_INTERVAL = 1000;

// ============================================================
// Pomocné funkcie
// ============================================================

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Stiahne detaily pre pole ID a priebežne ich ukladá cez callback.
 * Nečaká na stiahnutie všetkého — spracováva po dávkach.
 */
async function fetchAndProcessInBatches<T>(
  ids: number[],
  fetcher: (id: number) => Promise<T>,
  processor: (items: T[]) => Promise<void>,
  concurrency: number = CONCURRENT_REQUESTS,
  batchSize: number = DB_BATCH_SIZE,
  label: string = "items"
): Promise<number> {
  let processed = 0;
  let buffer: T[] = [];
  const startTime = Date.now();

  for (let i = 0; i < ids.length; i += concurrency) {
    const chunk = ids.slice(i, i + concurrency);
    const results = await Promise.allSettled(chunk.map((id) => fetcher(id)));

    for (const result of results) {
      if (result.status === "fulfilled") {
        buffer.push(result.value);
      }
      // Rejected items (404, deleted) are silently skipped
    }

    // Keď buffer dosiahne veľkosť dávky, uložíme do DB
    if (buffer.length >= batchSize) {
      await processor(buffer);
      processed += buffer.length;
      buffer = [];

      // Loguj progress
      if (processed % LOG_INTERVAL < batchSize || processed === batchSize) {
        const elapsed = Date.now() - startTime;
        const rate = processed / (elapsed / 1000);
        const remaining = ids.length - (i + concurrency);
        const eta = remaining > 0 ? formatDuration((remaining / rate) * 1000) : "~";
        console.log(
          `[SYNC] ${label}: ${processed}/${ids.length} (${((processed / ids.length) * 100).toFixed(1)}%) | ${rate.toFixed(1)}/s | ETA: ${eta}`
        );
      }
    }
  }

  // Spracuj zvyšok bufferu
  if (buffer.length > 0) {
    await processor(buffer);
    processed += buffer.length;
  }

  const totalTime = formatDuration(Date.now() - startTime);
  console.log(`[SYNC] ${label}: Done! ${processed}/${ids.length} in ${totalTime}`);

  return processed;
}

// ============================================================
// Synchronizácia číselníkov (Codebooks)
// ============================================================

export async function syncCodebooks(): Promise<{ synced: number; error?: string }> {
  try {
    console.log("[SYNC] Syncing codebooks...");
    let totalSynced = 0;

    // Právne formy
    console.log("[SYNC] Syncing právne formy...");
    const pravneFormy = await getCodebook("pravne-formy");
    if (pravneFormy.klasifikacie) {
      for (const item of pravneFormy.klasifikacie) {
        await prisma.pravnaForma.upsert({
          where: { kod: item.kod },
          create: { kod: item.kod, nazov: item.nazov },
          update: { nazov: item.nazov },
        });
      }
      totalSynced += pravneFormy.klasifikacie.length;
    }

    // SK NACE
    console.log("[SYNC] Syncing SK NACE...");
    const skNace = await getCodebook("sk-nace");
    if (skNace.klasifikacie) {
      for (const item of skNace.klasifikacie) {
        await prisma.skNace.upsert({
          where: { kod: item.kod },
          create: { kod: item.kod, nazov: item.nazov },
          update: { nazov: item.nazov },
        });
      }
      totalSynced += skNace.klasifikacie.length;
    }

    // Druhy vlastníctva
    console.log("[SYNC] Syncing druhy vlastníctva...");
    const druhyVlastnictva = await getCodebook("druhy-vlastnictva");
    if (druhyVlastnictva.klasifikacie) {
      for (const item of druhyVlastnictva.klasifikacie) {
        await prisma.druhVlastnictva.upsert({
          where: { kod: item.kod },
          create: { kod: item.kod, nazov: item.nazov },
          update: { nazov: item.nazov },
        });
      }
      totalSynced += druhyVlastnictva.klasifikacie.length;
    }

    // Veľkosti organizácie
    console.log("[SYNC] Syncing veľkosti organizácie...");
    const velkostiOrganizacie = await getCodebook("velkosti-organizacie");
    if (velkostiOrganizacie.klasifikacie) {
      for (const item of velkostiOrganizacie.klasifikacie) {
        await prisma.velkostOrganizacie.upsert({
          where: { kod: item.kod },
          create: { kod: item.kod, nazov: item.nazov },
          update: { nazov: item.nazov },
        });
      }
      totalSynced += velkostiOrganizacie.klasifikacie.length;
    }

    // Kraje
    console.log("[SYNC] Syncing kraje...");
    const kraje = await getCodebook("kraje");
    if (kraje.lokacie) {
      for (const item of kraje.lokacie) {
        await prisma.kraj.upsert({
          where: { kod: item.kod },
          create: { kod: item.kod, nazov: item.nazov },
          update: { nazov: item.nazov },
        });
      }
      totalSynced += kraje.lokacie.length;
    }

    // Okresy
    console.log("[SYNC] Syncing okresy...");
    const okresy = await getCodebook("okresy");
    if (okresy.lokacie) {
      for (const item of okresy.lokacie) {
        await prisma.okres.upsert({
          where: { kod: item.kod },
          create: {
            kod: item.kod,
            nazov: item.nazov,
            nadradenaLokacia: item.nadradenaLokacia,
          },
          update: {
            nazov: item.nazov,
            nadradenaLokacia: item.nadradenaLokacia,
          },
        });
      }
      totalSynced += okresy.lokacie.length;
    }

    // Sídla
    console.log("[SYNC] Syncing sídla...");
    const sidla = await getCodebook("sidla");
    if (sidla.lokacie) {
      for (const item of sidla.lokacie) {
        await prisma.sidlo.upsert({
          where: { kod: item.kod },
          create: {
            kod: item.kod,
            nazov: item.nazov,
            nadradenaLokacia: item.nadradenaLokacia,
          },
          update: {
            nazov: item.nazov,
            nadradenaLokacia: item.nadradenaLokacia,
          },
        });
      }
      totalSynced += sidla.lokacie.length;
    }

    console.log(`[SYNC] Codebooks synced: ${totalSynced} items`);
    return { synced: totalSynced };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC] Error syncing codebooks:", errorMsg);
    return { synced: 0, error: errorMsg };
  }
}

// ============================================================
// Synchronizácia šablón
// ============================================================

export async function syncTemplates(): Promise<{ synced: number; error?: string }> {
  try {
    console.log("[SYNC] Syncing templates...");
    const response = await getAllTemplates();
    let totalSynced = 0;

    if (response.sablony) {
      for (const template of response.sablony) {
        await prisma.reportTemplate.upsert({
          where: { id: template.id },
          create: {
            id: template.id,
            nazov: template.nazov,
            nariadenieMF: template.nariadenieMF,
            platneOd: parseDate(template.platneOd),
            platneDo: parseDate(template.platneDo),
            tabulky: template.tabulky ? JSON.stringify(template.tabulky) : null,
          },
          update: {
            nazov: template.nazov,
            nariadenieMF: template.nariadenieMF,
            platneOd: parseDate(template.platneOd),
            platneDo: parseDate(template.platneDo),
            tabulky: template.tabulky ? JSON.stringify(template.tabulky) : null,
          },
        });
        totalSynced++;
      }
    }

    console.log(`[SYNC] Templates synced: ${totalSynced} items`);
    return { synced: totalSynced };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC] Error syncing templates:", errorMsg);
    return { synced: 0, error: errorMsg };
  }
}

// ============================================================
// Raw SQL bulk upsert helpers
// ============================================================

/** Escapuje string pre SQL, alebo vráti NULL */
function sqlStr(val: string | undefined | null, maxLen?: number): string {
  if (val === undefined || val === null) return "NULL";
  let s = val;
  if (maxLen) s = s.substring(0, maxLen);
  return `'${s.replace(/'/g, "''")}'`;
}

function sqlDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "NULL";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "NULL";
    return `'${d.toISOString().split("T")[0]}'`;
  } catch {
    return "NULL";
  }
}

function sqlBool(val: boolean | undefined | null): string {
  return val ? "TRUE" : "FALSE";
}

function sqlInt(val: number | undefined | null): string {
  if (val === undefined || val === null) return "NULL";
  return String(val);
}

function sqlBigInt(val: number | bigint | undefined | null): string {
  if (val === undefined || val === null) return "NULL";
  return String(val);
}

function sqlJson(val: any): string {
  if (val === undefined || val === null) return "NULL";
  try {
    const json = typeof val === "string" ? val : JSON.stringify(val);
    return `'${json.replace(/'/g, "''")}'::jsonb`;
  } catch {
    return "NULL";
  }
}

// ============================================================
// Synchronizácia účtovných jednotiek (OPTIMALIZOVANÁ v3)
// ============================================================

async function bulkUpsertAccountingEntities(batch: AccountingEntityDetail[]): Promise<void> {
  const validBatch = batch.filter((d) => d.id != null);
  if (validBatch.length === 0) return;

  const values = validBatch.map((d) =>
    `(${sqlInt(d.id)}, ${sqlStr(d.ico, 8)}, ${sqlStr(d.dic, 10)}, ${sqlStr(d.sid, 5)}, ${sqlStr(d.nazovUJ, 500)}, ${sqlStr(d.mesto, 200)}, ${sqlStr(d.ulica, 200)}, ${sqlStr(d.psc, 10)}, ${sqlDate(d.datumZalozenia)}, ${sqlDate(d.datumZrusenia)}, ${sqlBool(d.konsolidovana)}, ${sqlStr(d.zdrojDat, 30)}, ${sqlDate(d.datumPoslednejUpravy)}, ${sqlBool(d.zmazana)}, ${sqlStr(d.pravnaForma, 100)}, ${sqlStr(d.skNace, 100)}, ${sqlStr(d.velkostOrganizacie, 100)}, ${sqlStr(d.druhVlastnictva, 100)}, ${sqlStr(d.kraj, 100)}, ${sqlStr(d.okres, 100)}, ${sqlStr(d.sidlo, 100)})`
  ).join(",\n");

  const sql = `
    INSERT INTO "AccountingEntity" (
      "id", "ico", "dic", "sid", "nazovUJ", "mesto", "ulica", "psc",
      "datumZalozenia", "datumZrusenia", "konsolidovana", "zdrojDat",
      "datumPoslednejUpravy", "zmazpiznakana",
      "pravnaFormaKod", "skNaceKod", "velkostOrganizacieKod", "druhVlastnictvaKod",
      "krajKod", "okresKod", "sidloKod"
    ) VALUES ${values}
    ON CONFLICT ("id") DO UPDATE SET
      "ico" = EXCLUDED."ico",
      "dic" = EXCLUDED."dic",
      "sid" = EXCLUDED."sid",
      "nazovUJ" = EXCLUDED."nazovUJ",
      "mesto" = EXCLUDED."mesto",
      "ulica" = EXCLUDED."ulica",
      "psc" = EXCLUDED."psc",
      "datumZalozenia" = EXCLUDED."datumZalozenia",
      "datumZrusenia" = EXCLUDED."datumZrusenia",
      "konsolidovana" = EXCLUDED."konsolidovana",
      "zdrojDat" = EXCLUDED."zdrojDat",
      "datumPoslednejUpravy" = EXCLUDED."datumPoslednejUpravy",
      "zmazpiznakana" = EXCLUDED."zmazpiznakana",
      "pravnaFormaKod" = EXCLUDED."pravnaFormaKod",
      "skNaceKod" = EXCLUDED."skNaceKod",
      "velkostOrganizacieKod" = EXCLUDED."velkostOrganizacieKod",
      "druhVlastnictvaKod" = EXCLUDED."druhVlastnictvaKod",
      "krajKod" = EXCLUDED."krajKod",
      "okresKod" = EXCLUDED."okresKod",
      "sidloKod" = EXCLUDED."sidloKod"
  `;

  await prisma.$executeRawUnsafe(sql);
}

export async function syncAccountingEntities(sinceDate: string): Promise<{
  synced: number;
  error?: string;
}> {
  try {
    console.log(`[SYNC] Syncing accounting entities since ${sinceDate}...`);

    const ids = await getAllIds("uctovne-jednotky", sinceDate, (downloaded) => {
      console.log(`[SYNC] Downloaded ${downloaded} accounting entity IDs...`);
    });

    console.log(`[SYNC] Found ${ids.length} accounting entities to process`);

    if (ids.length === 0) return { synced: 0 };

    // Pre prvý sync: preskočíme ID, ktoré už máme v DB
    let idsToFetch = ids;
    if (sinceDate === INITIAL_SYNC_DATE) {
      const existingIds = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT "id" FROM "AccountingEntity"`
      );
      const existingSet = new Set(existingIds.map((r) => r.id));
      idsToFetch = ids.filter((id) => !existingSet.has(id));
      console.log(`[SYNC] Skipping ${ids.length - idsToFetch.length} existing entities, fetching ${idsToFetch.length} new`);
    }

    const synced = await fetchAndProcessInBatches<AccountingEntityDetail>(
      idsToFetch,
      getAccountingEntity,
      bulkUpsertAccountingEntities,
      CONCURRENT_REQUESTS,
      DB_BATCH_SIZE,
      "Accounting entities"
    );

    return { synced };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC] Error syncing accounting entities:", errorMsg);
    return { synced: 0, error: errorMsg };
  }
}

// ============================================================
// Synchronizácia účtovných závierok (OPTIMALIZOVANÁ)
// ============================================================

async function bulkUpsertFinancialStatements(batch: FinancialStatementDetail[]): Promise<void> {
  // Filter out records without required fields
  const validBatch = batch.filter((d) => d.id != null && d.idUJ != null);
  if (validBatch.length === 0) return;

  const values = validBatch.map((d) => {
    // Map API field names to our interface (API uses datumPrilozeniaSpravyAuditora)
    const datumPrilozenia = (d as any).datumPrilozeniaSpravyAuditora || d.datumPrilozeniaSpr;
    return `(${sqlInt(d.id)}, ${sqlStr(d.obdobieOd, 7)}, ${sqlStr(d.obdobieDo, 7)}, ${sqlDate(d.datumPodania)}, ${sqlDate(d.datumZostavenia)}, ${sqlDate(d.datumSchvalenia)}, ${sqlDate(d.datumZostaveniaK)}, ${sqlDate(datumPrilozenia)}, ${sqlStr(d.nazovFondu, 500)}, ${sqlStr(d.leiKod, 20)}, ${sqlInt(d.idUJ)}, ${sqlBool(d.konsolidovana)}, ${sqlBool(d.konsolidovanaZavierkaUstrednejStatnejSpravy)}, ${sqlBool(d.suhrnnaUctovnaZavierkaVerejnejSpravy)}, ${sqlStr(d.typ, 30)}, ${sqlStr(d.zdrojDat, 30)}, ${sqlDate(d.datumPoslednejUpravy)}, ${sqlBool(d.zmazana)})`;
  }).join(",\n");

  const sql = `
    INSERT INTO "FinancialStatement" (
      "id", "obdobieOd", "obdobieDo", "datumPodania", "datumZostavenia",
      "datumSchvalenia", "datumZostaveniaK", "datumPrilozeniaSpr",
      "nazovFondu", "leiKod", "idUJ", "konsolidovana",
      "konsolidovanaUstredna", "suhrnnaVerejnaSprava",
      "typ", "zdrojDat", "datumPoslednejUpravy", "zmazana"
    ) VALUES ${values}
    ON CONFLICT ("id") DO UPDATE SET
      "obdobieOd" = EXCLUDED."obdobieOd",
      "obdobieDo" = EXCLUDED."obdobieDo",
      "datumPodania" = EXCLUDED."datumPodania",
      "datumZostavenia" = EXCLUDED."datumZostavenia",
      "datumSchvalenia" = EXCLUDED."datumSchvalenia",
      "datumZostaveniaK" = EXCLUDED."datumZostaveniaK",
      "datumPrilozeniaSpr" = EXCLUDED."datumPrilozeniaSpr",
      "nazovFondu" = EXCLUDED."nazovFondu",
      "leiKod" = EXCLUDED."leiKod",
      "konsolidovana" = EXCLUDED."konsolidovana",
      "konsolidovanaUstredna" = EXCLUDED."konsolidovanaUstredna",
      "suhrnnaVerejnaSprava" = EXCLUDED."suhrnnaVerejnaSprava",
      "typ" = EXCLUDED."typ",
      "zdrojDat" = EXCLUDED."zdrojDat",
      "datumPoslednejUpravy" = EXCLUDED."datumPoslednejUpravy",
      "zmazana" = EXCLUDED."zmazana"
  `;

  await prisma.$executeRawUnsafe(sql);
}

export async function syncFinancialStatements(sinceDate: string): Promise<{
  synced: number;
  error?: string;
}> {
  try {
    console.log(`[SYNC] Syncing financial statements since ${sinceDate}...`);

    const ids = await getAllIds("uctovne-zavierky", sinceDate, (downloaded) => {
      console.log(`[SYNC] Downloaded ${downloaded} financial statement IDs...`);
    });

    console.log(`[SYNC] Found ${ids.length} financial statements to process`);

    if (ids.length === 0) return { synced: 0 };

    // Preskočíme existujúce
    let idsToFetch = ids;
    if (sinceDate === INITIAL_SYNC_DATE) {
      const existingIds = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT "id" FROM "FinancialStatement"`
      );
      const existingSet = new Set(existingIds.map((r) => r.id));
      idsToFetch = ids.filter((id) => !existingSet.has(id));
      console.log(`[SYNC] Skipping ${ids.length - idsToFetch.length} existing statements, fetching ${idsToFetch.length} new`);
    }

    const synced = await fetchAndProcessInBatches<FinancialStatementDetail>(
      idsToFetch,
      getFinancialStatement,
      bulkUpsertFinancialStatements,
      CONCURRENT_REQUESTS,
      DB_BATCH_SIZE,
      "Financial statements"
    );

    return { synced };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC] Error syncing financial statements:", errorMsg);
    return { synced: 0, error: errorMsg };
  }
}

// ============================================================
// Synchronizácia účtovných výkazov (OPTIMALIZOVANÁ)
// ============================================================

async function bulkUpsertFinancialReports(batch: FinancialReportDetail[]): Promise<void> {
  const validBatch = batch.filter((d) => d.id != null);
  if (validBatch.length === 0) return;

  const values = validBatch.map((d) => {
    const tS = d.obsah?.titulnaStrana;
    const tabulky = d.obsah?.tabulky;
    return `(${sqlInt(d.id)}, ${sqlInt(d.idSablony)}, ${sqlStr(d.mena, 9)}, ${sqlStr(d.kodDanovehoUradu, 3)}, ${sqlStr(d.pristupnostDat, 30)}, ${sqlStr(d.zdrojDat, 30)}, ${sqlDate(d.datumPoslednejUpravy)}, ${sqlBool(d.zmazany)}, ${sqlInt(d.idUctovnejZavierky)}, ${sqlInt(d.idVyrocnejSpravy)}, ${sqlStr(tS?.nazovUctovnejJednotky, 500)}, ${sqlStr(tS?.ico, 8)}, ${sqlStr(tS?.pravnaForma, 100)}, ${sqlStr(tS?.skNace, 100)}, ${sqlStr(tS?.typZavierky, 30)}, ${sqlBool(tS?.konsolidovana)}, ${sqlStr(tS?.typUctovnejJednotky, 30)}, ${sqlStr(tS?.obdobieOd, 7)}, ${sqlStr(tS?.obdobieDo, 7)}, ${sqlStr(tS?.predchadzajuceObdobieOd, 7)}, ${sqlStr(tS?.predchadzajuceObdobieDo, 7)}, ${sqlJson(tabulky)})`;
  }).join(",\n");

  const sql = `
    INSERT INTO "FinancialReport" (
      "id", "idSablony", "mena", "kodDanovehoUradu", "pristupnostDat",
      "zdrojDat", "datumPoslednejUpravy", "zmazany",
      "idUctovnejZavierky", "idVyrocnejSpravy",
      "tsNazovUJ", "tsICO", "tsPravnaForma", "tsSkNace",
      "tsTypZavierky", "tsKonsolidovana", "tsTypUctovnejJednotky",
      "tsObdobieOd", "tsObdobieDo", "tsPredchObdobieOd", "tsPredchObdobieDo",
      "tabulky"
    ) VALUES ${values}
    ON CONFLICT ("id") DO UPDATE SET
      "idSablony" = EXCLUDED."idSablony",
      "mena" = EXCLUDED."mena",
      "kodDanovehoUradu" = EXCLUDED."kodDanovehoUradu",
      "pristupnostDat" = EXCLUDED."pristupnostDat",
      "zdrojDat" = EXCLUDED."zdrojDat",
      "datumPoslednejUpravy" = EXCLUDED."datumPoslednejUpravy",
      "zmazany" = EXCLUDED."zmazany",
      "idUctovnejZavierky" = EXCLUDED."idUctovnejZavierky",
      "idVyrocnejSpravy" = EXCLUDED."idVyrocnejSpravy",
      "tsNazovUJ" = EXCLUDED."tsNazovUJ",
      "tsICO" = EXCLUDED."tsICO",
      "tsPravnaForma" = EXCLUDED."tsPravnaForma",
      "tsSkNace" = EXCLUDED."tsSkNace",
      "tsTypZavierky" = EXCLUDED."tsTypZavierky",
      "tsKonsolidovana" = EXCLUDED."tsKonsolidovana",
      "tsTypUctovnejJednotky" = EXCLUDED."tsTypUctovnejJednotky",
      "tsObdobieOd" = EXCLUDED."tsObdobieOd",
      "tsObdobieDo" = EXCLUDED."tsObdobieDo",
      "tsPredchObdobieOd" = EXCLUDED."tsPredchObdobieOd",
      "tsPredchObdobieDo" = EXCLUDED."tsPredchObdobieDo",
      "tabulky" = EXCLUDED."tabulky"
  `;

  await prisma.$executeRawUnsafe(sql);

  // Bulk upsert príloh (menej kritické, ale tiež optimalizované)
  const attachments: { reportId: number; priloha: any }[] = [];
  for (const detail of batch) {
    if (detail.prilohy) {
      for (const p of detail.prilohy) {
        attachments.push({ reportId: detail.id, priloha: p });
      }
    }
  }

  if (attachments.length > 0) {
    const attValues = attachments.map((a) =>
      `(${a.priloha.id}, ${sqlStr(a.priloha.meno, 100)}, ${sqlStr(a.priloha.mimeType, 80)}, ${sqlBigInt(a.priloha.velkostPrilohy)}, ${sqlInt(a.priloha.pocetStran)}, ${sqlStr(a.priloha.digest, 64)}, ${sqlStr(a.priloha.jazyk, 3)}, ${a.reportId}, NULL)`
    ).join(",\n");

    const attSql = `
      INSERT INTO "Attachment" ("id", "meno", "mimeType", "velkostPrilohy", "pocetStran", "digest", "jazyk", "idFinancialReport", "idAnnualReport")
      VALUES ${attValues}
      ON CONFLICT ("id") DO UPDATE SET
        "meno" = EXCLUDED."meno", "mimeType" = EXCLUDED."mimeType",
        "velkostPrilohy" = EXCLUDED."velkostPrilohy", "pocetStran" = EXCLUDED."pocetStran",
        "digest" = EXCLUDED."digest", "jazyk" = EXCLUDED."jazyk"
    `;
    await prisma.$executeRawUnsafe(attSql);
  }
}

export async function syncFinancialReports(sinceDate: string): Promise<{
  synced: number;
  error?: string;
}> {
  try {
    console.log(`[SYNC] Syncing financial reports since ${sinceDate}...`);

    const ids = await getAllIds("uctovne-vykazy", sinceDate, (downloaded) => {
      console.log(`[SYNC] Downloaded ${downloaded} financial report IDs...`);
    });

    console.log(`[SYNC] Found ${ids.length} financial reports to process`);

    if (ids.length === 0) return { synced: 0 };

    let idsToFetch = ids;
    if (sinceDate === INITIAL_SYNC_DATE) {
      const existingIds = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT "id" FROM "FinancialReport"`
      );
      const existingSet = new Set(existingIds.map((r) => r.id));
      idsToFetch = ids.filter((id) => !existingSet.has(id));
      console.log(`[SYNC] Skipping ${ids.length - idsToFetch.length} existing reports, fetching ${idsToFetch.length} new`);
    }

    const synced = await fetchAndProcessInBatches<FinancialReportDetail>(
      idsToFetch,
      getFinancialReport,
      bulkUpsertFinancialReports,
      CONCURRENT_REQUESTS,
      DB_BATCH_SIZE,
      "Financial reports"
    );

    return { synced };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC] Error syncing financial reports:", errorMsg);
    return { synced: 0, error: errorMsg };
  }
}

// ============================================================
// Synchronizácia výročných správ (OPTIMALIZOVANÁ)
// ============================================================

async function bulkUpsertAnnualReports(batch: AnnualReportDetail[]): Promise<void> {
  const validBatch = batch.filter((d) => d.id != null);
  if (validBatch.length === 0) return;

  const values = validBatch.map((d) =>
    `(${sqlInt(d.id)}, ${sqlStr(d.nazovUJ, 500)}, ${sqlStr(d.typ, 100)}, ${sqlStr(d.nazovFondu, 500)}, ${sqlStr(d.leiKod, 20)}, ${sqlStr(d.obdobieOd, 7)}, ${sqlStr(d.obdobieDo, 7)}, ${sqlDate(d.datumPodania)}, ${sqlDate(d.datumZostaveniaK)}, ${sqlStr(d.pristupnostDat, 30)}, ${sqlInt(d.rok)}, ${sqlInt(d.idUJ)}, ${sqlStr(d.zdrojDat, 30)}, ${sqlDate(d.datumPoslednejUpravy)}, ${sqlBool(d.zmazana)})`
  ).join(",\n");

  const sql = `
    INSERT INTO "AnnualReport" (
      "id", "nazovUJ", "typ", "nazovFondu", "leiKod",
      "obdobieOd", "obdobieDo", "datumPodania", "datumZostaveniaK",
      "pristupnostDat", "rok", "idUJ", "zdrojDat", "datumPoslednejUpravy", "zmazana"
    ) VALUES ${values}
    ON CONFLICT ("id") DO UPDATE SET
      "nazovUJ" = EXCLUDED."nazovUJ",
      "typ" = EXCLUDED."typ",
      "nazovFondu" = EXCLUDED."nazovFondu",
      "leiKod" = EXCLUDED."leiKod",
      "obdobieOd" = EXCLUDED."obdobieOd",
      "obdobieDo" = EXCLUDED."obdobieDo",
      "datumPodania" = EXCLUDED."datumPodania",
      "datumZostaveniaK" = EXCLUDED."datumZostaveniaK",
      "pristupnostDat" = EXCLUDED."pristupnostDat",
      "rok" = EXCLUDED."rok",
      "zdrojDat" = EXCLUDED."zdrojDat",
      "datumPoslednejUpravy" = EXCLUDED."datumPoslednejUpravy",
      "zmazana" = EXCLUDED."zmazana"
  `;

  await prisma.$executeRawUnsafe(sql);

  // Bulk upsert príloh
  const attachments: { reportId: number; priloha: any }[] = [];
  for (const detail of batch) {
    if (detail.prilohy) {
      for (const p of detail.prilohy) {
        attachments.push({ reportId: detail.id, priloha: p });
      }
    }
  }

  if (attachments.length > 0) {
    const attValues = attachments.map((a) =>
      `(${a.priloha.id}, ${sqlStr(a.priloha.meno, 100)}, ${sqlStr(a.priloha.mimeType, 80)}, ${sqlBigInt(a.priloha.velkostPrilohy)}, ${sqlInt(a.priloha.pocetStran)}, ${sqlStr(a.priloha.digest, 64)}, ${sqlStr(a.priloha.jazyk, 3)}, NULL, ${a.reportId})`
    ).join(",\n");

    const attSql = `
      INSERT INTO "Attachment" ("id", "meno", "mimeType", "velkostPrilohy", "pocetStran", "digest", "jazyk", "idFinancialReport", "idAnnualReport")
      VALUES ${attValues}
      ON CONFLICT ("id") DO UPDATE SET
        "meno" = EXCLUDED."meno", "mimeType" = EXCLUDED."mimeType",
        "velkostPrilohy" = EXCLUDED."velkostPrilohy", "pocetStran" = EXCLUDED."pocetStran",
        "digest" = EXCLUDED."digest", "jazyk" = EXCLUDED."jazyk"
    `;
    await prisma.$executeRawUnsafe(attSql);
  }
}

export async function syncAnnualReports(sinceDate: string): Promise<{
  synced: number;
  error?: string;
}> {
  try {
    console.log(`[SYNC] Syncing annual reports since ${sinceDate}...`);

    const ids = await getAllIds("vyrocne-spravy", sinceDate, (downloaded) => {
      console.log(`[SYNC] Downloaded ${downloaded} annual report IDs...`);
    });

    console.log(`[SYNC] Found ${ids.length} annual reports to process`);

    if (ids.length === 0) return { synced: 0 };

    let idsToFetch = ids;
    if (sinceDate === INITIAL_SYNC_DATE) {
      const existingIds = await prisma.$queryRawUnsafe<{ id: number }[]>(
        `SELECT "id" FROM "AnnualReport"`
      );
      const existingSet = new Set(existingIds.map((r) => r.id));
      idsToFetch = ids.filter((id) => !existingSet.has(id));
      console.log(`[SYNC] Skipping ${ids.length - idsToFetch.length} existing annual reports, fetching ${idsToFetch.length} new`);
    }

    const synced = await fetchAndProcessInBatches<AnnualReportDetail>(
      idsToFetch,
      getAnnualReport,
      bulkUpsertAnnualReports,
      CONCURRENT_REQUESTS,
      DB_BATCH_SIZE,
      "Annual reports"
    );

    return { synced };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC] Error syncing annual reports:", errorMsg);
    return { synced: 0, error: errorMsg };
  }
}

// ============================================================
// Orchestrácia — Úplná synchronizácia
// ============================================================

export interface SyncResult {
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  duration: number; // ms
  results: {
    codebooks?: { synced: number; error?: string };
    templates?: { synced: number; error?: string };
    accountingEntities?: { synced: number; error?: string };
    financialStatements?: { synced: number; error?: string };
    financialReports?: { synced: number; error?: string };
    annualReports?: { synced: number; error?: string };
  };
  errors: string[];
}

/**
 * Helper na vytvorenie/aktualizáciu SyncLog pre danú entitu
 */
async function syncPhase(
  entityType: string,
  syncFn: (sinceDate: string) => Promise<{ synced: number; error?: string }>,
  startedAt: Date
): Promise<{ synced: number; error?: string }> {
  // Nájdi posledný úspešný sync
  let sinceDate = INITIAL_SYNC_DATE;
  const lastLog = await prisma.syncLog.findFirst({
    where: { entityType, status: "completed" },
    orderBy: { completedAt: "desc" },
  });
  if (lastLog?.lastSyncDate) {
    sinceDate = formatDate(lastLog.lastSyncDate);
  }

  // Vytvor/aktualizuj SyncLog ako "running"
  const syncLog = await prisma.syncLog.create({
    data: {
      entityType,
      status: "running",
      lastSyncDate: startedAt,
      startedAt,
    },
  });

  const result = await syncFn(sinceDate);

  // Aktualizuj SyncLog podľa výsledku
  await prisma.syncLog.update({
    where: { id: syncLog.id },
    data: {
      status: result.error ? "failed" : "completed",
      totalSynced: result.synced,
      completedAt: new Date(),
      error: result.error ?? null,
      lastSyncDate: result.error ? lastLog?.lastSyncDate : startedAt,
    },
  });

  return result;
}

export async function runFullSync(): Promise<SyncResult> {
  const startedAt = new Date();
  const errors: string[] = [];
  const results: SyncResult["results"] = {};

  console.log("[SYNC] =============================================");
  console.log("[SYNC] Starting full synchronization...");
  console.log("[SYNC] =============================================");

  try {
    // 1. Číselníky
    console.log("[SYNC] Phase 1: Syncing codebooks...");
    results.codebooks = await syncCodebooks();
    if (results.codebooks.error) errors.push(`Codebooks: ${results.codebooks.error}`);

    // 2. Šablóny
    console.log("[SYNC] Phase 2: Syncing templates...");
    results.templates = await syncTemplates();
    if (results.templates.error) errors.push(`Templates: ${results.templates.error}`);

    // 3. Účtovné jednotky
    console.log("[SYNC] Phase 3: Syncing accounting entities...");
    results.accountingEntities = await syncPhase("uctovne-jednotky", syncAccountingEntities, startedAt);
    if (results.accountingEntities.error) errors.push(`Accounting entities: ${results.accountingEntities.error}`);

    // 4. Účtovné závierky
    console.log("[SYNC] Phase 4: Syncing financial statements...");
    results.financialStatements = await syncPhase("uctovne-zavierky", syncFinancialStatements, startedAt);
    if (results.financialStatements.error) errors.push(`Financial statements: ${results.financialStatements.error}`);

    // 5. Účtovné výkazy
    console.log("[SYNC] Phase 5: Syncing financial reports...");
    results.financialReports = await syncPhase("uctovne-vykazy", syncFinancialReports, startedAt);
    if (results.financialReports.error) errors.push(`Financial reports: ${results.financialReports.error}`);

    // 6. Výročné správy
    console.log("[SYNC] Phase 6: Syncing annual reports...");
    results.annualReports = await syncPhase("vyrocne-spravy", syncAnnualReports, startedAt);
    if (results.annualReports.error) errors.push(`Annual reports: ${results.annualReports.error}`);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SYNC] Fatal error:", errorMsg);
    errors.push(`Fatal: ${errorMsg}`);
  }

  const completedAt = new Date();
  const duration = completedAt.getTime() - startedAt.getTime();

  console.log("[SYNC] =============================================");
  console.log(`[SYNC] Full sync completed in ${formatDuration(duration)}`);
  console.log(`[SYNC] Errors: ${errors.length}`);
  console.log("[SYNC] =============================================");

  return {
    success: errors.length === 0,
    startedAt,
    completedAt,
    duration,
    results,
    errors,
  };
}

/**
 * Run a single sync phase by name.
 * Supported phases: codebooks, templates, entities, statements, reports, annual
 */
export async function runPhaseSync(phase: string): Promise<{ synced: number; error?: string }> {
  const startedAt = new Date();

  console.log(`[SYNC] =============================================`);
  console.log(`[SYNC] Running single phase: ${phase}`);
  console.log(`[SYNC] =============================================`);

  switch (phase) {
    case "codebooks":
      return syncCodebooks();
    case "templates":
      return syncTemplates();
    case "entities":
      return syncPhase("uctovne-jednotky", syncAccountingEntities, startedAt);
    case "statements":
      return syncPhase("uctovne-zavierky", syncFinancialStatements, startedAt);
    case "reports":
      return syncPhase("uctovne-vykazy", syncFinancialReports, startedAt);
    case "annual":
      return syncPhase("vyrocne-spravy", syncAnnualReports, startedAt);
    default:
      return { synced: 0, error: `Unknown phase: ${phase}. Valid phases: codebooks, templates, entities, statements, reports, annual` };
  }
}
