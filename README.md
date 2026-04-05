# Register účtovných závierok pre výskum

Webová aplikácia na prehliadanie, filtrovanie a export dát z [Registra účtovných závierok SR](https://www.registeruz.sk/) pre účely akademického výskumu.

## Funkcie

- **Filtrovanie** — podľa kraja, okresu, právnej formy, veľkosti organizácie, SK NACE, typu závierky, obdobia
- **Štatistiky** — interaktívne grafy (regionálne porovnania, rozdelenie podľa veľkosti, trendy)
- **Export** — CSV export filtrovaných dát
- **Automatická synchronizácia** — denný cron job sťahuje nové dáta z RÚZ Open API

## Technológie

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS, Recharts
- **Backend:** Next.js API Routes, Prisma ORM
- **Databáza:** PostgreSQL
- **Hosting:** Vercel (frontend + API) + Railway/Supabase (PostgreSQL)
- **Zdroj dát:** RÚZ Open API v2.5 (licencia CC0)

## Rýchly štart

### 1. Klonovanie a inštalácia

```bash
git clone <repo-url>
cd register-uz-app
npm install
```

### 2. Databáza

Vytvor PostgreSQL databázu (napríklad na [Railway](https://railway.app/) alebo [Supabase](https://supabase.com/)):

```bash
cp .env.example .env
# Vyplň DATABASE_URL v .env
```

### 3. Migrácia databázy

```bash
npx prisma generate
npx prisma db push
```

### 4. Prvá synchronizácia dát

```bash
# Spustenie vývojového servera
npm run dev

# V novom termináli spusti sync (stiahne všetky dáta z RÚZ):
curl -X POST http://localhost:3000/api/sync
```

Prvá synchronizácia trvá dlhšie (hodiny), pretože sťahuje všetky dáta od roku 2009. Nasledujúce synchronizácie sú inkrementálne a trvajú len minúty.

### 5. Nasadenie na Vercel

```bash
npm i -g vercel
vercel
```

Nastav environment variables v Vercel Dashboard: DATABASE_URL a CRON_SECRET.

## Štruktúra projektu

```
src/
├── app/
│   ├── api/
│   │   ├── codebooks/route.ts  — číselníky pre filtre
│   │   ├── cron/sync/route.ts  — cron endpoint (Vercel)
│   │   ├── entities/route.ts   — účtovné jednotky
│   │   ├── export/route.ts     — CSV export
│   │   ├── statements/route.ts — účtovné závierky
│   │   ├── stats/route.ts      — štatistiky pre grafy
│   │   └── sync/route.ts       — manuálna synchronizácia
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                — hlavná stránka
├── components/
│   ├── DataTable.tsx           — tabuľka s triedením a stránkovaním
│   ├── ExportButton.tsx        — export do CSV
│   ├── FilterPanel.tsx         — filtrovacie panely
│   ├── StatsPanel.tsx          — grafy a štatistiky
│   └── SyncStatus.tsx          — stav synchronizácie
├── lib/
│   ├── db.ts                   — Prisma klient
│   ├── ruz-api.ts              — RÚZ API klient
│   └── sync.ts                 — synchronizačný modul
├── types/
│   └── index.ts                — zdieľané TypeScript typy
prisma/
└── schema.prisma               — databázová schéma
```

## API endpointy

- GET /api/codebooks — Číselníky (kraje, právne formy, ...)
- GET /api/entities — Zoznam účtovných jednotiek s filtrami
- GET /api/statements — Zoznam účtovných závierok s filtrami
- GET /api/stats — Agregované štatistiky pre grafy
- GET /api/export — Export dát do CSV
- GET/POST /api/sync — Stav/spustenie synchronizácie
- GET /api/cron/sync — Automatická synchronizácia (Vercel Cron)

## Licencia

Zdrojové dáta z RÚZ sú pod licenciou CC0 (verejná doména).
