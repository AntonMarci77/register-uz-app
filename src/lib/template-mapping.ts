/**
 * Mapovanie medzi šablónami účtovných závierok
 *
 * Hlavné šablóny pre podnikateľov účtujúcich v sústave podvojného účtovníctva:
 * - ID 687: Úč MUJ (mikro účtovné jednotky) — od 2014, MF/18008/2014
 * - ID 699: Úč POD (malé a veľké účtovné jednotky) — od 2014, MF/18009/2014-74
 *
 * Mikro šablóna obsahuje zjednodušené (agregované) položky.
 * Úč POD má podrobnejší rozpis — každý riadok mikro sa mapuje na jeden alebo viac riadkov POD.
 *
 * Pre porovnateľnosť: keď študent analyzuje mikro aj malé/veľké ÚJ spolu,
 * mapujeme mikro riadky na súčty zodpovedajúcich POD riadkov.
 */

// ============================================================
// Template IDs
// ============================================================

/** Šablóna pre mikro účtovné jednotky */
export const TEMPLATE_MICRO_ID = 687;
/** Šablóna pre malé a veľké účtovné jednotky */
export const TEMPLATE_POD_ID = 699;

/** Všetky verzie mikro šablón (rôzne obdobia) */
export const MICRO_TEMPLATE_IDS = [687, 5181];
/** Všetky verzie šablón pre malé/veľké (rôzne obdobia) */
export const POD_TEMPLATE_IDS = [699, 5184];

// ============================================================
// Definície tabuliek v šablónach
// ============================================================

export type TableType = "aktiva" | "pasiva" | "vzas" | "pohladavky" | "zavazky" | "dane" | "prijmy" | "vydavky" | "majetok" | "other";

// ============================================================
// Kategórie šablón
// ============================================================

export type TemplateCategory =
  | "podnikatelia"       // Podnikatelia (podvojné účtovníctvo)
  | "ropo"               // Rozpočtové a príspevkové organizácie
  | "nuj"                // Neziskové účtovné jednotky
  | "banky"              // Banky a finančné inštitúcie
  | "poistovne"          // Poisťovne
  | "jednoduche"         // Jednoduché účtovníctvo
  | "zdravotne"          // Zdravotné poisťovne
  | "ine";               // Ostatné / špeciálne

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  podnikatelia: "Podnikatelia (podvojné účtovníctvo)",
  ropo: "Rozpočtové a príspevkové organizácie",
  nuj: "Neziskové účtovné jednotky",
  banky: "Banky a finančné inštitúcie",
  poistovne: "Poisťovne",
  jednoduche: "Jednoduché účtovníctvo",
  zdravotne: "Zdravotné poisťovne",
  ine: "Ostatné",
};

export interface TemplateRow {
  /** Označenie riadku (napr. "A.", "A.I.", "A.II.1.") */
  oznacenie: string;
  /** Číslo riadku v šablóne */
  riadok: number;
  /** Popis položky */
  text: string;
  /** Skrátený popis pre grafy a tabuľky */
  shortText: string;
}

export interface RowMapping {
  /** Spoločný identifikátor pre mapovanie medzi šablónami */
  mappingId: string;
  /** Skrátený popis spoločný pre obe šablóny */
  label: string;
  /** Riadok v mikro šablóne (null ak nemá priamy ekvivalent) */
  microRow: number | null;
  /** Riadky v POD šablóne, ktoré sa sčítajú (null ak nemá ekvivalent) */
  podRows: number[] | null;
  /** Tabuľka, do ktorej patrí */
  table: TableType;
  /** Úroveň hierarchie (0 = celkový súčet, 1 = hlavná kategória, 2 = podkategória, 3 = detail) */
  level: number;
}

// ============================================================
// AKTÍVA — Strana aktív (Súvaha)
// ============================================================

/**
 * Mikro šablóna (ID 687) — Strana aktív: 23 riadkov
 * POD šablóna (ID 699) — Strana aktív: 78 riadkov
 *
 * Mikro agreguje podrobné riadky POD — napr. mikro "Pozemky a stavby" (r5)
 * = POD "Pozemky" (r12) + "Stavby" (r13)
 */
export const AKTIVA_MAPPING: RowMapping[] = [
  // MAJETOK SPOLU
  {
    mappingId: "A_TOTAL",
    label: "SPOLU MAJETOK",
    microRow: 1,
    podRows: [1],
    table: "aktiva",
    level: 0,
  },

  // ── A. Neobežný majetok ──
  {
    mappingId: "A_NON_CURRENT",
    label: "Neobežný majetok",
    microRow: 2,
    podRows: [2],
    table: "aktiva",
    level: 1,
  },

  // A.I. Dlhodobý nehmotný majetok
  {
    mappingId: "A_I_INTANGIBLE",
    label: "Dlhodobý nehmotný majetok",
    microRow: 3,
    podRows: [3],
    table: "aktiva",
    level: 2,
  },
  // POD detail: A.I.1-7 (r4-r10) — mikro nemá ekvivalent (je to v r3 agregované)
  { mappingId: "A_I_1_DEV", label: "Aktivované náklady na vývoj", microRow: null, podRows: [4], table: "aktiva", level: 3 },
  { mappingId: "A_I_2_SW", label: "Softvér", microRow: null, podRows: [5], table: "aktiva", level: 3 },
  { mappingId: "A_I_3_RIGHTS", label: "Oceniteľné práva", microRow: null, podRows: [6], table: "aktiva", level: 3 },
  { mappingId: "A_I_4_GOODWILL", label: "Goodwill", microRow: null, podRows: [7], table: "aktiva", level: 3 },
  { mappingId: "A_I_5_OTHER_INTANG", label: "Ostatný dlhodobý nehmotný majetok", microRow: null, podRows: [8], table: "aktiva", level: 3 },
  { mappingId: "A_I_6_INTANG_WIP", label: "Obstarávaný dlhodobý nehmotný majetok", microRow: null, podRows: [9], table: "aktiva", level: 3 },
  { mappingId: "A_I_7_INTANG_ADV", label: "Preddavky na dlhodobý nehmotný majetok", microRow: null, podRows: [10], table: "aktiva", level: 3 },

  // A.II. Dlhodobý hmotný majetok
  {
    mappingId: "A_II_TANGIBLE",
    label: "Dlhodobý hmotný majetok",
    microRow: 4,
    podRows: [11],
    table: "aktiva",
    level: 2,
  },
  // Mikro r5 "Pozemky a stavby" = POD r12 + r13
  {
    mappingId: "A_II_1_LAND_BUILD",
    label: "Pozemky a stavby",
    microRow: 5,
    podRows: [12, 13],
    table: "aktiva",
    level: 3,
  },
  // Mikro r6 "Samostatné hnuteľné veci" = POD r14
  {
    mappingId: "A_II_2_MOVABLES",
    label: "Samostatné hnuteľné veci a súbory",
    microRow: 6,
    podRows: [14],
    table: "aktiva",
    level: 3,
  },
  // Mikro r7 "Ostatný DHM" = POD r15 + r16 + r17
  {
    mappingId: "A_II_3_OTHER_TANG",
    label: "Ostatný dlhodobý hmotný majetok",
    microRow: 7,
    podRows: [15, 16, 17],
    table: "aktiva",
    level: 3,
  },
  // POD detail: Pestovateľské celky, Základné stádo, Ostatný DHM
  { mappingId: "A_II_4_CROPS", label: "Pestovateľské celky trvalých porastov", microRow: null, podRows: [15], table: "aktiva", level: 3 },
  { mappingId: "A_II_5_LIVESTOCK", label: "Základné stádo a ťažné zvieratá", microRow: null, podRows: [16], table: "aktiva", level: 3 },
  // Mikro r8 "Opravná položka k nadobudnutému majetku" = POD r20
  {
    mappingId: "A_II_4_REVALUATION",
    label: "Opravná položka k nadobudnutému majetku",
    microRow: 8,
    podRows: [20],
    table: "aktiva",
    level: 3,
  },
  // POD r18 Obstarávaný DHM, r19 Preddavky na DHM — mikro nemá
  { mappingId: "A_II_7_TANG_WIP", label: "Obstarávaný dlhodobý hmotný majetok", microRow: null, podRows: [18], table: "aktiva", level: 3 },
  { mappingId: "A_II_8_TANG_ADV", label: "Preddavky na dlhodobý hmotný majetok", microRow: null, podRows: [19], table: "aktiva", level: 3 },

  // A.III. Dlhodobý finančný majetok
  {
    mappingId: "A_III_FIN",
    label: "Dlhodobý finančný majetok",
    microRow: 9,
    podRows: [21],
    table: "aktiva",
    level: 2,
  },
  // Mikro r10 = POD r22+r23+r24 (podielové CP)
  {
    mappingId: "A_III_1_SHARES",
    label: "Podielové cenné papiere",
    microRow: 10,
    podRows: [22, 23, 24],
    table: "aktiva",
    level: 3,
  },
  // Mikro r11 = POD r25+r26+r27+r28+r29
  {
    mappingId: "A_III_2_OTHER_FIN",
    label: "Ostatný dlhodobý finančný majetok",
    microRow: 11,
    podRows: [25, 26, 27, 28, 29],
    table: "aktiva",
    level: 3,
  },
  // Mikro r12 = POD nemá priamy ekvivalent (bankové účty > 1 rok)
  {
    mappingId: "A_III_3_BANK_LONG",
    label: "Účty v bankách s viazanosťou > 1 rok",
    microRow: 12,
    podRows: null,
    table: "aktiva",
    level: 3,
  },
  // Mikro r13 = POD r30+r31+r32
  {
    mappingId: "A_III_4_FIN_ADV",
    label: "Obstarávaný DFM a preddavky",
    microRow: 13,
    podRows: [30, 31, 32],
    table: "aktiva",
    level: 3,
  },

  // ── B. Obežný majetok ──
  {
    mappingId: "B_CURRENT",
    label: "Obežný majetok",
    microRow: 14,
    podRows: [33],
    table: "aktiva",
    level: 1,
  },

  // B.I. Zásoby
  {
    mappingId: "B_I_INVENTORY",
    label: "Zásoby",
    microRow: 15,
    podRows: [34],
    table: "aktiva",
    level: 2,
  },
  // Mikro nemá podrobný rozpis zásob, POD má r35-r40

  // B.II. Dlhodobé pohľadávky (len POD r41, mikro nemá)
  {
    mappingId: "B_II_LT_RECEIVABLES",
    label: "Dlhodobé pohľadávky",
    microRow: null,
    podRows: [41],
    table: "aktiva",
    level: 2,
  },

  // B.III. Krátkodobé pohľadávky
  {
    mappingId: "B_III_ST_RECEIVABLES",
    label: "Krátkodobé pohľadávky",
    microRow: 16,
    podRows: [53],
    table: "aktiva",
    level: 2,
  },

  // B.IV. Krátkodobý finančný majetok (len POD r65)
  {
    mappingId: "B_IV_ST_FIN",
    label: "Krátkodobý finančný majetok",
    microRow: null,
    podRows: [65],
    table: "aktiva",
    level: 2,
  },

  // B.V. Finančné účty
  {
    mappingId: "B_V_CASH",
    label: "Finančné účty",
    microRow: 17,
    podRows: [71],
    table: "aktiva",
    level: 2,
  },

  // ── C. Časové rozlíšenie ──
  {
    mappingId: "C_PREPAID",
    label: "Časové rozlíšenie",
    microRow: 18,
    podRows: [74],
    table: "aktiva",
    level: 1,
  },
];

// ============================================================
// PASÍVA — Strana pasív (Súvaha)
// ============================================================

export const PASIVA_MAPPING: RowMapping[] = [
  // PASÍVA SPOLU
  {
    mappingId: "P_TOTAL",
    label: "SPOLU VLASTNÉ IMANIE A ZÁVÄZKY",
    microRow: 24,
    podRows: [79],
    table: "pasiva",
    level: 0,
  },

  // ── A. Vlastné imanie ──
  {
    mappingId: "P_A_EQUITY",
    label: "Vlastné imanie",
    microRow: 25,
    podRows: [80],
    table: "pasiva",
    level: 1,
  },
  // A.I. Základné imanie
  {
    mappingId: "P_A_I_CAPITAL",
    label: "Základné imanie",
    microRow: 26,
    podRows: [81],
    table: "pasiva",
    level: 2,
  },
  {
    mappingId: "P_A_I_1_CAPITAL_BASE",
    label: "Základné imanie a zmeny ZI",
    microRow: 27,
    podRows: [82],
    table: "pasiva",
    level: 3,
  },
  {
    mappingId: "P_A_I_2_CAPITAL_RECV",
    label: "Pohľadávky za upísané vlastné imanie",
    microRow: 28,
    podRows: [83, 84],
    table: "pasiva",
    level: 3,
  },
  // A.II. Kapitálové fondy — mikro r29 = POD r85
  {
    mappingId: "P_A_II_CAPITAL_FUNDS",
    label: "Kapitálové fondy",
    microRow: 29,
    podRows: [85],
    table: "pasiva",
    level: 2,
  },
  // A.III. Fondy zo zisku — mikro r30 = POD r91
  {
    mappingId: "P_A_III_PROFIT_FUNDS",
    label: "Fondy zo zisku",
    microRow: 30,
    podRows: [91],
    table: "pasiva",
    level: 2,
  },
  // A.IV. Oceňovacie rozdiely — mikro r31 = POD r95
  {
    mappingId: "P_A_IV_REVALUATION",
    label: "Oceňovacie rozdiely",
    microRow: 31,
    podRows: [95],
    table: "pasiva",
    level: 2,
  },
  // A.V. Nerozdelený zisk/strata — mikro r32 = POD r100
  {
    mappingId: "P_A_V_RETAINED",
    label: "Nerozdelený zisk / neuhradená strata",
    microRow: 32,
    podRows: [100],
    table: "pasiva",
    level: 2,
  },
  // A.VI. VH za účtovné obdobie — mikro r33 = POD r101
  {
    mappingId: "P_A_VI_PROFIT",
    label: "VH za účtovné obdobie po zdanení",
    microRow: 33,
    podRows: [101],
    table: "pasiva",
    level: 2,
  },

  // ── B. Záväzky ──
  {
    mappingId: "P_B_LIABILITIES",
    label: "Záväzky",
    microRow: 34,
    podRows: [102],
    table: "pasiva",
    level: 1,
  },
  // B.I. Dlhodobé záväzky (okrem rezerv a úverov)
  {
    mappingId: "P_B_I_LT_LIAB",
    label: "Dlhodobé záväzky",
    microRow: 35,
    podRows: [103],
    table: "pasiva",
    level: 2,
  },
  // B.II. Dlhodobé rezervy
  {
    mappingId: "P_B_II_LT_RESERVES",
    label: "Dlhodobé rezervy",
    microRow: 36,
    podRows: [118],
    table: "pasiva",
    level: 2,
  },
  // B.III. Dlhodobé bankové úvery
  {
    mappingId: "P_B_III_LT_LOANS",
    label: "Dlhodobé bankové úvery",
    microRow: 37,
    podRows: [121],
    table: "pasiva",
    level: 2,
  },
  // B.IV. Krátkodobé záväzky (okrem rezerv a úverov)
  {
    mappingId: "P_B_IV_ST_LIAB",
    label: "Krátkodobé záväzky",
    microRow: 38,
    podRows: [122],
    table: "pasiva",
    level: 2,
  },
  // B.V. Krátkodobé rezervy
  {
    mappingId: "P_B_V_ST_RESERVES",
    label: "Krátkodobé rezervy",
    microRow: 39,
    podRows: [139],
    table: "pasiva",
    level: 2,
  },
  // B.VI. Bežné bankové úvery
  {
    mappingId: "P_B_VI_ST_LOANS",
    label: "Bežné bankové úvery",
    microRow: 40,
    podRows: [140],
    table: "pasiva",
    level: 2,
  },
  // B.VII. Krátkodobé finančné výpomoci
  {
    mappingId: "P_B_VII_ST_FIN_AID",
    label: "Krátkodobé finančné výpomoci",
    microRow: 41,
    podRows: [141],
    table: "pasiva",
    level: 2,
  },

  // ── C. Časové rozlíšenie ──
  {
    mappingId: "P_C_ACCRUALS",
    label: "Časové rozlíšenie",
    microRow: 42,
    podRows: [142],
    table: "pasiva",
    level: 1,
  },
];

// ============================================================
// VÝKAZ ZISKOV A STRÁT
// ============================================================

/**
 * VZaS je zložitejší na mapovanie, pretože:
 * - Mikro má zjednodušený formát (VZaS tabuľka = tabuľka č. 3 v Úč MUJ)
 * - POD má plný výkaz ziskov a strát (tabuľka č. 3 v Úč POD)
 *
 * Hlavné porovnateľné ukazovatele:
 */
export const VZAS_MAPPING: RowMapping[] = [
  // Tržby z predaja tovaru
  {
    mappingId: "V_SALES_GOODS",
    label: "Tržby z predaja tovaru",
    microRow: 46,
    podRows: [156],
    table: "vzas",
    level: 2,
  },
  // Tržby z predaja vlastných výrobkov a služieb
  {
    mappingId: "V_SALES_PRODUCTS",
    label: "Tržby z predaja vlastných výrobkov a služieb",
    microRow: 47,
    podRows: [157, 158, 159, 160, 161],
    table: "vzas",
    level: 2,
  },
  // Výrobná spotreba (náklady)
  {
    mappingId: "V_PRODUCTION_COST",
    label: "Výrobná spotreba",
    microRow: null,
    podRows: [162],
    table: "vzas",
    level: 2,
  },
  // Pridaná hodnota (výnosy - náklady na predaj)
  {
    mappingId: "V_ADDED_VALUE",
    label: "Pridaná hodnota",
    microRow: null,
    podRows: [173],
    table: "vzas",
    level: 1,
  },
  // Osobné náklady
  {
    mappingId: "V_PERSONNEL_COSTS",
    label: "Osobné náklady",
    microRow: 48,
    podRows: [174],
    table: "vzas",
    level: 2,
  },
  // Odpisy
  {
    mappingId: "V_DEPRECIATION",
    label: "Odpisy a opravné položky k DNM a DHM",
    microRow: null,
    podRows: [179, 180],
    table: "vzas",
    level: 2,
  },
  // VH z hospodárskej činnosti
  {
    mappingId: "V_OPERATING_PROFIT",
    label: "VH z hospodárskej činnosti",
    microRow: null,
    podRows: [200],
    table: "vzas",
    level: 1,
  },
  // Výnosové úroky
  {
    mappingId: "V_INTEREST_INCOME",
    label: "Výnosové úroky",
    microRow: null,
    podRows: [205],
    table: "vzas",
    level: 2,
  },
  // Nákladové úroky
  {
    mappingId: "V_INTEREST_EXPENSE",
    label: "Nákladové úroky",
    microRow: null,
    podRows: [208],
    table: "vzas",
    level: 2,
  },
  // VH z finančnej činnosti
  {
    mappingId: "V_FINANCIAL_PROFIT",
    label: "VH z finančnej činnosti",
    microRow: null,
    podRows: [213],
    table: "vzas",
    level: 1,
  },
  // Daň z príjmov
  {
    mappingId: "V_TAX",
    label: "Daň z príjmov",
    microRow: 49,
    podRows: [214],
    table: "vzas",
    level: 2,
  },
  // VH za účtovné obdobie po zdanení
  {
    mappingId: "V_NET_PROFIT",
    label: "VH za účtovné obdobie po zdanení",
    microRow: 50,
    podRows: [218],
    table: "vzas",
    level: 0,
  },
];

// ============================================================
// Pomocné funkcie
// ============================================================

/** Všetky mapovania v jednom poli */
export const ALL_MAPPINGS: RowMapping[] = [
  ...AKTIVA_MAPPING,
  ...PASIVA_MAPPING,
  ...VZAS_MAPPING,
];

/**
 * Nájde mapovanie podľa ID
 */
export function getMappingById(mappingId: string): RowMapping | undefined {
  return ALL_MAPPINGS.find((m) => m.mappingId === mappingId);
}

/**
 * Nájde všetky mapovania pre danú tabuľku
 */
export function getMappingsForTable(table: TableType): RowMapping[] {
  return ALL_MAPPINGS.filter((m) => m.table === table);
}

/**
 * Nájde všetky mapovania, ktoré majú ekvivalent v oboch šablónach
 * (t.j. aj microRow aj podRows sú definované)
 */
export function getComparableMappings(): RowMapping[] {
  return ALL_MAPPINGS.filter((m) => m.microRow !== null && m.podRows !== null);
}

/**
 * Pre daný riadok mikro šablóny nájde zodpovedajúce POD riadky
 */
export function microToPodRows(microRow: number): number[] | null {
  const mapping = ALL_MAPPINGS.find((m) => m.microRow === microRow);
  return mapping?.podRows ?? null;
}

/**
 * Pre daný riadok POD šablóny nájde zodpovedajúci mikro riadok
 */
export function podToMicroRow(podRow: number): number | null {
  const mapping = ALL_MAPPINGS.find(
    (m) => m.podRows?.includes(podRow)
  );
  return mapping?.microRow ?? null;
}

/**
 * Informácie o šablóne
 */
export interface TemplateInfo {
  id: number;
  name: string;
  shortName: string;
  description: string;
  category: TemplateCategory;
  /** Ak je toto novšia verzia inej šablóny, ID staršej verzie */
  previousVersionId?: number;
  /** Súvisiace šablóny (napr. VZaS k súvahe) */
  relatedIds?: number[];
  tables: { name: string; type: TableType; tableIndex: number }[];
}

export const TEMPLATE_INFO: Record<number, TemplateInfo> = {
  // ============================================================
  // PODNIKATELIA — Podvojné účtovníctvo
  // ============================================================

  687: {
    id: 687,
    name: "Účtovná závierka mikro účtovných jednotiek (Úč MUJ)",
    shortName: "Úč MUJ (Mikro)",
    description: "Zjednodušená účtovná závierka pre mikro účtovné jednotky podľa opatrenia MF/18008/2014. Platná od 1.1.2014. Obsahuje súvahu (aktíva 23r, pasíva 22r) a zjednodušený VZaS (38r).",
    category: "podnikatelia",
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
    ],
  },
  699: {
    id: 699,
    name: "Účtovná závierka malých a veľkých účtovných jednotiek (Úč POD)",
    shortName: "Úč POD (Malé/Veľké)",
    description: "Účtovná závierka pre malé a veľké účtovné jednotky podľa opatrenia MF/18009/2014-74. Platná od 1.1.2014. Obsahuje podrobnú súvahu (aktíva 78r, pasíva 67r) a plný VZaS (61r).",
    category: "podnikatelia",
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
    ],
  },
  5181: {
    id: 5181,
    name: "Účtovná závierka mikro ÚJ (Úč MUJ) — nový formát 2023",
    shortName: "Úč MUJ 2023",
    description: "Nový formát pre mikro účtovné jednotky platný od 31.12.2023. Aktualizovaná verzia šablóny 687.",
    category: "podnikatelia",
    previousVersionId: 687,
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
      { name: "Doplňujúce údaje", type: "other", tableIndex: 3 },
    ],
  },
  5184: {
    id: 5184,
    name: "Účtovná závierka malých a veľkých ÚJ (Úč POD) — nový formát 2023",
    shortName: "Úč POD 2023",
    description: "Nový formát pre malé a veľké účtovné jednotky podľa MF/013185/2022-74, platný od 31.12.2023. Aktualizovaná verzia šablóny 699.",
    category: "podnikatelia",
    previousVersionId: 699,
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
    ],
  },
  1001: {
    id: 1001,
    name: "Konsolidovaná účtovná závierka (Úč KONSOLIDOVANÁ)",
    shortName: "Konsolidovaná",
    description: "Konsolidovaná účtovná závierka podľa opatrenia MF/14950/2015-74. Platná od 1.1.2015.",
    category: "podnikatelia",
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
    ],
  },

  // ============================================================
  // ROZPOČTOVÉ A PRÍSPEVKOVÉ ORGANIZÁCIE (ROPO)
  // ============================================================

  21: {
    id: 21,
    name: "Súvaha — rozpočtové organizácie, príspevkové organizácie, štátne fondy, obce, VÚC",
    shortName: "Súvaha ROPO",
    description: "Súvaha pre rozpočtové/príspevkové organizácie podľa MF/25947/1/2010. Platná od 1.1.2011. Aktíva 65r (4 stĺpce: brutto, korekcia, netto, netto predch.), pasíva 60r (2 stĺpce).",
    category: "ropo",
    relatedIds: [22],
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
    ],
  },
  22: {
    id: 22,
    name: "Výkaz ziskov a strát — rozpočtové organizácie, príspevkové organizácie, štátne fondy, obce, VÚC",
    shortName: "VZaS ROPO",
    description: "VZaS pre rozpočtové/príspevkové organizácie podľa MF/24219/3/2008. Platná od 1.1.2009. 61 riadkov (2 stĺpce: bežné a predchádzajúce obdobie).",
    category: "ropo",
    relatedIds: [21],
    tables: [
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 0 },
    ],
  },
  1164: {
    id: 1164,
    name: "Súvaha ROPO — nový formát 2022",
    shortName: "Súvaha ROPO 2022",
    description: "Nový formát súvahy pre ROPO podľa MF/011077/2021-74, platný od 1.1.2022.",
    category: "ropo",
    previousVersionId: 21,
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
      { name: "Doplňujúce údaje", type: "other", tableIndex: 3 },
    ],
  },

  // ============================================================
  // NEZISKOVÉ ÚČTOVNÉ JEDNOTKY (NÚJ) — Podvojné účtovníctvo
  // ============================================================

  943: {
    id: 943,
    name: "Účtovná závierka neziskovej účtovnej jednotky (Úč NÚJ)",
    shortName: "Úč NÚJ",
    description: "Účtovná závierka pre neziskové ÚJ (občianske združenia, nadácie, neziskové organizácie, cirkvi a pod.). Platná od 31.12.2015. Obsahuje súvahu (36r), pohľadávky/záväzky po splatnosti, VZaS (37r) a dane.",
    category: "nuj",
    tables: [
      { name: "Súvaha (Aktíva a Pasíva)", type: "aktiva", tableIndex: 0 },
      { name: "Pohľadávky po lehote splatnosti", type: "pohladavky", tableIndex: 1 },
      { name: "Záväzky po lehote splatnosti", type: "zavazky", tableIndex: 2 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 3 },
      { name: "Daň z príjmov", type: "dane", tableIndex: 4 },
    ],
  },
  5183: {
    id: 5183,
    name: "Účtovná závierka NÚJ — nový formát 2023",
    shortName: "Úč NÚJ 2023",
    description: "Nový formát pre neziskové ÚJ platný od 1.1.2023. Aktualizovaná verzia šablóny 943 s doplnením počtu zamestnancov.",
    category: "nuj",
    previousVersionId: 943,
    tables: [
      { name: "Súvaha (Aktíva a Pasíva)", type: "aktiva", tableIndex: 0 },
      { name: "Pohľadávky po lehote splatnosti", type: "pohladavky", tableIndex: 1 },
      { name: "Záväzky po lehote splatnosti", type: "zavazky", tableIndex: 2 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 3 },
      { name: "Daň z príjmov", type: "dane", tableIndex: 4 },
      { name: "Počet zamestnancov", type: "other", tableIndex: 5 },
    ],
  },
  661: {
    id: 661,
    name: "Účtovná závierka NÚJ — staršia verzia (2012)",
    shortName: "Úč NÚJ 2012",
    description: "Staršia verzia závierky pre NÚJ platná od 1.1.2012. Predchodca šablóny 943.",
    category: "nuj",
    tables: [
      { name: "Súvaha (Aktíva a Pasíva)", type: "aktiva", tableIndex: 0 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 1 },
    ],
  },
  733: {
    id: 733,
    name: "Účtovná závierka NÚJ — verzia 2014",
    shortName: "Úč NÚJ 2014",
    description: "Verzia závierky pre NÚJ platná od 2013. Predchodca šablóny 943.",
    category: "nuj",
    previousVersionId: 661,
    tables: [
      { name: "Súvaha (Aktíva a Pasíva)", type: "aktiva", tableIndex: 0 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 1 },
    ],
  },

  // ============================================================
  // NEZISKOVÉ ORGANIZÁCIE — Jednoduché účtovníctvo
  // ============================================================

  383: {
    id: 383,
    name: "Účtovná závierka v jednoduchom účtovníctve — neziskové organizácie",
    shortName: "Jednoduché NZO",
    description: "Závierka pre neziskové organizácie účtujúce v sústave jednoduchého účtovníctva podľa MF/17695/2013-74. Príjmy (16r), výdavky (11r), majetok (11r) a záväzky (6r).",
    category: "jednoduche",
    tables: [
      { name: "Príjmy", type: "prijmy", tableIndex: 0 },
      { name: "Výdavky", type: "vydavky", tableIndex: 1 },
      { name: "Majetok", type: "majetok", tableIndex: 2 },
      { name: "Záväzky", type: "zavazky", tableIndex: 3 },
    ],
  },
  716: {
    id: 716,
    name: "Účtovná závierka v jednoduchom účtovníctve — podnikatelia (Úč FO)",
    shortName: "Úč FO (Jednoduché)",
    description: "Závierka pre podnikateľov (SZČO) účtujúcich v sústave jednoduchého účtovníctva podľa MF/15523/2014-74. Príjmy (4r), výdavky (8r), majetok (15r) a záväzky (6r).",
    category: "jednoduche",
    tables: [
      { name: "Príjmy", type: "prijmy", tableIndex: 0 },
      { name: "Výdavky", type: "vydavky", tableIndex: 1 },
      { name: "Majetok", type: "majetok", tableIndex: 2 },
      { name: "Záväzky", type: "zavazky", tableIndex: 3 },
    ],
  },

  // ============================================================
  // BANKY A FINANČNÉ INŠTITÚCIE
  // ============================================================

  1121: {
    id: 1121,
    name: "Účtovná závierka bánk a pobočiek zahraničných bánk (2019)",
    shortName: "Banky 2019",
    description: "Závierka pre banky — od 31.12.2019. Aktíva (28r), pasíva (23r), VZaS (24r).",
    category: "banky",
    previousVersionId: 941,
    tables: [
      { name: "Aktíva", type: "aktiva", tableIndex: 0 },
      { name: "Pasíva", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
    ],
  },
  5181: {
    id: 5181,
    name: "Účtovná závierka bánk a pobočiek zahraničných bánk (2023)",
    shortName: "Banky 2023",
    description: "Nový formát závierky pre banky od 31.12.2023. Aktíva (28r), pasíva (23r), VZaS (24r) + počet zamestnancov.",
    category: "banky",
    previousVersionId: 1121,
    tables: [
      { name: "Aktíva", type: "aktiva", tableIndex: 0 },
      { name: "Pasíva", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
      { name: "Počet zamestnancov", type: "other", tableIndex: 3 },
    ],
  },
  941: {
    id: 941,
    name: "Účtovná závierka bánk a pobočiek zahraničných bánk (2015)",
    shortName: "Banky 2015",
    description: "Závierka pre banky — od 31.12.2015. Aktíva (16r), pasíva (15r), VZaS (21r).",
    category: "banky",
    tables: [
      { name: "Aktíva", type: "aktiva", tableIndex: 0 },
      { name: "Pasíva", type: "pasiva", tableIndex: 1 },
      { name: "Výkaz ziskov a strát", type: "vzas", tableIndex: 2 },
    ],
  },

  // ============================================================
  // POISŤOVNE
  // ============================================================

  942: {
    id: 942,
    name: "Účtovná závierka poisťovní a pobočiek zahraničných poisťovní",
    shortName: "Poisťovne",
    description: "Závierka pre poisťovne — od 31.12.2015. Rozsiahly formát: 8 tabuliek (aktíva, pasíva, životné/neživotné poistenie, pohľadávky, podsúvaha).",
    category: "poistovne",
    tables: [
      { name: "Aktíva (bežné obdobie)", type: "aktiva", tableIndex: 0 },
      { name: "Pasíva (bežné obdobie)", type: "pasiva", tableIndex: 1 },
      { name: "Aktíva (predchádzajúce obdobie)", type: "aktiva", tableIndex: 2 },
      { name: "Pasíva (predchádzajúce obdobie)", type: "pasiva", tableIndex: 3 },
      { name: "Pohľadávky po lehote splatnosti", type: "pohladavky", tableIndex: 4 },
      { name: "Podsúvahové položky", type: "other", tableIndex: 5 },
      { name: "Technický účet (bežné obdobie)", type: "vzas", tableIndex: 6 },
      { name: "Technický účet (predchádzajúce obdobie)", type: "vzas", tableIndex: 7 },
    ],
  },
  5182: {
    id: 5182,
    name: "Účtovná závierka poisťovní — nový formát 2023",
    shortName: "Poisťovne 2023",
    description: "Nový formát závierky pre poisťovne od 31.12.2023.",
    category: "poistovne",
    previousVersionId: 942,
    tables: [
      { name: "Aktíva (bežné obdobie)", type: "aktiva", tableIndex: 0 },
      { name: "Pasíva (bežné obdobie)", type: "pasiva", tableIndex: 1 },
      { name: "Aktíva (predchádzajúce obdobie)", type: "aktiva", tableIndex: 2 },
      { name: "Pasíva (predchádzajúce obdobie)", type: "pasiva", tableIndex: 3 },
      { name: "Pohľadávky po lehote splatnosti", type: "pohladavky", tableIndex: 4 },
      { name: "Podsúvahové položky", type: "other", tableIndex: 5 },
    ],
  },

  // ============================================================
  // ZDRAVOTNÉ POISŤOVNE
  // ============================================================

  1101: {
    id: 1101,
    name: "Účtovná závierka zdravotných poisťovní",
    shortName: "Zdravotné poisťovne",
    description: "Závierka pre zdravotné poisťovne podľa MF/14950/2015-74/2. Platná od 1.1.2016. Aktíva (56r), pasíva (52r), technický účet (46r).",
    category: "zdravotne",
    tables: [
      { name: "Aktíva", type: "aktiva", tableIndex: 0 },
      { name: "Pasíva", type: "pasiva", tableIndex: 1 },
      { name: "Technický účet", type: "vzas", tableIndex: 2 },
    ],
  },

  // ============================================================
  // ROPO — Jednoduché účtovníctvo (staršie)
  // ============================================================

  385: {
    id: 385,
    name: "Účtovná závierka ROPO — podvojné účtovníctvo (staršia verzia 2013)",
    shortName: "ROPO 2013",
    description: "Staršia závierka pre rozpočtové organizácie s podrobným rozpisom podľa MF/17616/2013-74. Aktíva (60r), pasíva (44r), náklady (38r), výnosy (40r).",
    category: "ropo",
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Náklady", type: "vzas", tableIndex: 2 },
      { name: "Výnosy", type: "vzas", tableIndex: 3 },
    ],
  },
  1180: {
    id: 1180,
    name: "Účtovná závierka ROPO — podvojné účtovníctvo (nový formát 2022)",
    shortName: "ROPO podvojné 2022",
    description: "Nový formát závierky pre ROPO podľa MF/011079/2021-74, platný od 1.1.2022. Aktíva, pasíva, náklady a výnosy.",
    category: "ropo",
    previousVersionId: 385,
    tables: [
      { name: "Súvaha — Strana aktív", type: "aktiva", tableIndex: 0 },
      { name: "Súvaha — Strana pasív", type: "pasiva", tableIndex: 1 },
      { name: "Náklady", type: "vzas", tableIndex: 2 },
      { name: "Výnosy", type: "vzas", tableIndex: 3 },
    ],
  },
};

// ============================================================
// Pomocné funkcie pre kategórie
// ============================================================

/**
 * Vráti všetky známe šablóny pre danú kategóriu
 */
export function getTemplatesByCategory(category: TemplateCategory): TemplateInfo[] {
  return Object.values(TEMPLATE_INFO).filter((t) => t.category === category);
}

/**
 * Vráti kategóriu pre danú šablónu (alebo 'ine' ak nie je známa)
 */
export function getTemplateCategory(templateId: number): TemplateCategory {
  return TEMPLATE_INFO[templateId]?.category ?? "ine";
}

/**
 * Vráti ľudsky čitateľný názov šablóny (alebo null ak nie je známa)
 */
export function getTemplateName(templateId: number): string | null {
  return TEMPLATE_INFO[templateId]?.shortName ?? null;
}

/**
 * Vráti zoskupené šablóny podľa kategórií
 */
export function getGroupedTemplates(): { category: TemplateCategory; label: string; templates: TemplateInfo[] }[] {
  const categories: TemplateCategory[] = ["podnikatelia", "ropo", "nuj", "banky", "poistovne", "jednoduche", "zdravotne"];
  return categories
    .map((cat) => ({
      category: cat,
      label: TEMPLATE_CATEGORY_LABELS[cat],
      templates: getTemplatesByCategory(cat).sort((a, b) => b.id - a.id), // novšie prvé
    }))
    .filter((g) => g.templates.length > 0);
}
