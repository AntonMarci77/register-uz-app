/**
 * RÚZ Open API v2.5 klient
 * Dokumentácia: https://www.registeruz.sk/cruz-public/home/api
 * Licencia dát: CC0
 */

const BASE_URL = "https://www.registeruz.sk/cruz-public/api";

// ============================================================
// Typy
// ============================================================

export interface IdListResponse {
  id: number[];
  existujeDalsieId: boolean;
}

export interface CountResponse {
  pocetZostavajucichId: number;
}

export interface AccountingEntityDetail {
  id: number;
  ico?: string;
  dic?: string;
  sid?: string;
  nazovUJ?: string;
  mesto?: string;
  ulica?: string;
  psc?: string;
  datumZalozenia?: string;
  datumZrusenia?: string;
  pravnaForma?: string;
  skNace?: string;
  velkostOrganizacie?: string;
  druhVlastnictva?: string;
  kraj?: string;
  okres?: string;
  sidlo?: string;
  konsolidovana?: boolean;
  zdrojDat?: string;
  datumPoslednejUpravy?: string;
  idUctovnychZavierok?: number[];
  idVyrocnychSprav?: number[];
  zmazana?: boolean;
}

export interface FinancialStatementDetail {
  id: number;
  obdobieOd?: string;
  obdobieDo?: string;
  datumPodania?: string;
  datumZostavenia?: string;
  datumSchvalenia?: string;
  datumZostaveniaK?: string;
  datumPrilozeniaSpr?: string;
  nazovFondu?: string;
  leiKod?: string;
  idUJ: number;
  konsolidovana?: boolean;
  konsolidovanaZavierkaUstrednejStatnejSpravy?: boolean;
  suhrnnaUctovnaZavierkaVerejnejSpravy?: boolean;
  typ?: string;
  idUctovnychVykazov?: number[];
  zdrojDat?: string;
  datumPoslednejUpravy?: string;
  zmazana?: boolean;
}

export interface TitulnaStrana {
  nazovUctovnejJednotky?: string;
  ico?: string;
  dic?: string;
  sid?: string;
  adresa?: { ulica?: string; cislo?: string; psc?: string; mesto?: string };
  miestoPodnikania?: { ulica?: string; cislo?: string; psc?: string; mesto?: string };
  pravnaForma?: string;
  skNace?: string;
  typZavierky?: string;
  konsolidovana?: boolean;
  typUctovnejJednotky?: string;
  obdobieOd?: string;
  obdobieDo?: string;
  predchadzajuceObdobieOd?: string;
  predchadzajuceObdobieDo?: string;
  datumVyplnenia?: string;
  datumSchvalenia?: string;
  datumZostavenia?: string;
  datumZostaveniaK?: string;
}

export interface TableData {
  nazov: string | Record<string, string>;
  data: string[];
}

export interface AttachmentInfo {
  id: number;
  meno?: string;
  mimeType?: string;
  velkostPrilohy?: number;
  pocetStran?: number;
  digest?: string;
  jazyk?: string;
}

export interface FinancialReportDetail {
  id: number;
  idUctovnejZavierky?: number;
  idVyrocnejSpravy?: number;
  idSablony?: number;
  mena?: string;
  kodDanovehoUradu?: string;
  pristupnostDat?: string;
  obsah?: {
    titulnaStrana?: TitulnaStrana;
    tabulky?: TableData[];
  };
  prilohy?: AttachmentInfo[];
  zdrojDat?: string;
  datumPoslednejUpravy?: string;
  zmazany?: boolean;
}

export interface AnnualReportDetail {
  id: number;
  nazovUJ?: string;
  typ?: string;
  nazovFondu?: string;
  leiKod?: string;
  obdobieOd?: string;
  obdobieDo?: string;
  datumPodania?: string;
  datumZostaveniaK?: string;
  pristupnostDat?: string;
  rok?: number;
  idUJ: number;
  idUctovnychVykazov?: number[];
  prilohy?: AttachmentInfo[];
  zdrojDat?: string;
  datumPoslednejUpravy?: string;
  zmazana?: boolean;
}

export interface CodebookItem {
  kod: string;
  nazov: Record<string, string>;
  nadradenaLokacia?: string;
}

export interface TemplateDetail {
  id: number;
  nazov: string;
  nariadenieMF?: string;
  platneOd?: string;
  platneDo?: string;
  tabulky?: Array<{
    nazov: Record<string, string>;
    hlavicka: Array<{
      text: Record<string, string>;
      riadok: number;
      stlpec: number;
      sirkaStlpca: number;
      vyskaRiadku: number;
    }>;
    riadky: Array<{
      oznacenie?: string;
      cisloRiadku: number;
      text: Record<string, string>;
    }>;
  }>;
}

// ============================================================
// HTTP helper s retry logikou
// ============================================================

async function fetchJSON<T>(url: string, retries = 3): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      });

      if (res.status === 404) {
        throw new Error(`Not found: ${url}`);
      }
      if (res.status === 400) {
        const text = await res.text();
        throw new Error(`Bad request: ${text}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries - 1) {
        // Exponential backoff
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

// ============================================================
// API funkcie — Zoznamy identifikátorov
// ============================================================

interface ListParams {
  zmeneneOd: string; // povinný, formát RRRR-MM-DD alebo RRRR-MM-DDThh:mm:ssZ
  pokracovatZaId?: number;
  maxZaznamov?: number; // max 10000, default 1000
  // Extra parametre pre účtovné jednotky:
  ico?: string;
  dic?: string;
  pravnaForma?: string;
}

function buildListUrl(endpoint: string, params: ListParams): string {
  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("zmenene-od", params.zmeneneOd);
  if (params.pokracovatZaId != null) {
    url.searchParams.set("pokracovat-za-id", String(params.pokracovatZaId));
  }
  if (params.maxZaznamov != null) {
    url.searchParams.set("max-zaznamov", String(params.maxZaznamov));
  }
  if (params.ico) url.searchParams.set("ico", params.ico);
  if (params.dic) url.searchParams.set("dic", params.dic);
  if (params.pravnaForma) url.searchParams.set("pravna-forma", params.pravnaForma);
  return url.toString();
}

/** Zoznam ID účtovných jednotiek */
export async function getAccountingEntityIds(params: ListParams): Promise<IdListResponse> {
  return fetchJSON<IdListResponse>(buildListUrl("uctovne-jednotky", params));
}

/** Zoznam ID účtovných závierok */
export async function getFinancialStatementIds(params: ListParams): Promise<IdListResponse> {
  return fetchJSON<IdListResponse>(buildListUrl("uctovne-zavierky", params));
}

/** Zoznam ID účtovných výkazov */
export async function getFinancialReportIds(params: ListParams): Promise<IdListResponse> {
  return fetchJSON<IdListResponse>(buildListUrl("uctovne-vykazy", params));
}

/** Zoznam ID výročných správ */
export async function getAnnualReportIds(params: ListParams): Promise<IdListResponse> {
  return fetchJSON<IdListResponse>(buildListUrl("vyrocne-spravy", params));
}

// ============================================================
// API funkcie — Počty zostávajúcich identifikátorov
// ============================================================

export async function getRemainingCount(
  entityType: "uctovne-jednotky" | "uctovne-zavierky" | "uctovne-vykazy" | "vyrocne-spravy",
  params: ListParams
): Promise<CountResponse> {
  return fetchJSON<CountResponse>(buildListUrl(`zostavajuce-id/${entityType}`, params));
}

// ============================================================
// API funkcie — Detaily entít
// ============================================================

export async function getAccountingEntity(id: number): Promise<AccountingEntityDetail> {
  return fetchJSON<AccountingEntityDetail>(`${BASE_URL}/uctovna-jednotka?id=${id}`);
}

export async function getFinancialStatement(id: number): Promise<FinancialStatementDetail> {
  return fetchJSON<FinancialStatementDetail>(`${BASE_URL}/uctovna-zavierka?id=${id}`);
}

export async function getFinancialReport(id: number): Promise<FinancialReportDetail> {
  return fetchJSON<FinancialReportDetail>(`${BASE_URL}/uctovny-vykaz?id=${id}`);
}

export async function getAnnualReport(id: number): Promise<AnnualReportDetail> {
  return fetchJSON<AnnualReportDetail>(`${BASE_URL}/vyrocna-sprava?id=${id}`);
}

// ============================================================
// API funkcie — Šablóny
// ============================================================

export async function getTemplate(id: number): Promise<TemplateDetail> {
  return fetchJSON<TemplateDetail>(`${BASE_URL}/sablona?id=${id}`);
}

export async function getAllTemplates(): Promise<{ sablony: TemplateDetail[] }> {
  return fetchJSON<{ sablony: TemplateDetail[] }>(`${BASE_URL}/sablony`);
}

// ============================================================
// API funkcie — Číselníky
// ============================================================

export async function getCodebook(
  type:
    | "pravne-formy"
    | "sk-nace"
    | "druhy-vlastnictva"
    | "velkosti-organizacie"
    | "kraje"
    | "okresy"
    | "sidla"
): Promise<{ klasifikacie?: CodebookItem[]; lokacie?: CodebookItem[] }> {
  return fetchJSON(`${BASE_URL}/${type}`);
}

// ============================================================
// Pomocné funkcie pre hromadné sťahovanie
// ============================================================

/**
 * Stiahne všetky ID pre daný typ entity stránkovaním.
 * Vracia celkový zoznam ID.
 */
export async function getAllIds(
  entityType: "uctovne-jednotky" | "uctovne-zavierky" | "uctovne-vykazy" | "vyrocne-spravy",
  zmeneneOd: string,
  onProgress?: (downloaded: number) => void
): Promise<number[]> {
  const allIds: number[] = [];
  let pokracovatZaId: number | undefined;
  let hasMore = true;

  const fetcher =
    entityType === "uctovne-jednotky"
      ? getAccountingEntityIds
      : entityType === "uctovne-zavierky"
        ? getFinancialStatementIds
        : entityType === "uctovne-vykazy"
          ? getFinancialReportIds
          : getAnnualReportIds;

  while (hasMore) {
    const result = await fetcher({
      zmeneneOd,
      pokracovatZaId,
      maxZaznamov: 10000,
    });

    allIds.push(...result.id);
    hasMore = result.existujeDalsieId;

    if (result.id.length > 0) {
      pokracovatZaId = result.id[result.id.length - 1];
    }

    onProgress?.(allIds.length);
  }

  return allIds;
}

/**
 * Stiahne detaily pre pole ID v dávkach s kontrolou súbežnosti.
 */
export async function fetchDetailsInBatches<T>(
  ids: number[],
  fetcher: (id: number) => Promise<T>,
  concurrency = 5,
  onProgress?: (done: number, total: number) => void
): Promise<T[]> {
  const results: T[] = [];
  let done = 0;

  for (let i = 0; i < ids.length; i += concurrency) {
    const batch = ids.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((id) => fetcher(id)));

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
      // Rejected items are skipped (e.g. deleted entities returning 404)
    }

    done += batch.length;
    onProgress?.(done, ids.length);
  }

  return results;
}
