"use client";

import { useState } from "react";
import {
  BookOpen,
  Download,
  BarChart3,
  GitCompare,
  Database,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  GraduationCap,
  Search,
  Filter,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="text-teal-600">{icon}</span>
        <span className="font-semibold text-slate-800 flex-1">{title}</span>
        {open ? (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {open && <div className="px-6 pb-6 border-t border-slate-100">{children}</div>}
    </div>
  );
}

interface TipProps {
  children: React.ReactNode;
}

function Tip({ children }: TipProps) {
  return (
    <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
      <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-amber-800">{children}</div>
    </div>
  );
}

interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Step({ number, title, children }: StepProps) {
  return (
    <div className="flex gap-4 my-4">
      <div className="flex-shrink-0 w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-medium text-slate-800 mb-1">{title}</h4>
        <div className="text-sm text-slate-600">{children}</div>
      </div>
    </div>
  );
}

const RESEARCH_IDEAS = [
  {
    title: "Regionálna analýza finančného zdravia",
    description:
      "Porovnajte kľúčové ukazovatele (celkový majetok, vlastné imanie, VH) medzi krajmi SR. Identifikujte regióny s najvyšším/najnižším priemerným majetkom.",
    filters: "Kraj, Obdobie, Veľkostná kategória",
    template: "Úč POD (699)",
    difficulty: "Základná",
  },
  {
    title: "Vplyv veľkosti podniku na kapitálovú štruktúru",
    description:
      "Analyzujte pomer vlastného imania k cudziemu kapitálu podľa veľkostných kategórií (mikro, malé, veľké). Zistite, či menšie podniky majú väčšiu zadlženosť.",
    filters: "Veľkostná kategória, Obdobie",
    template: "Úč POD (699)",
    difficulty: "Stredná",
  },
  {
    title: "Sektorová analýza rentability",
    description:
      "Porovnajte výsledok hospodárenia v rôznych odvetviach (SK NACE). Identifikujte najziskovejšie a najstratovejšie sektory.",
    filters: "SK NACE, Obdobie, Typ závierky",
    template: "Úč POD (699) alebo Úč MUJ (687)",
    difficulty: "Stredná",
  },
  {
    title: "Časový vývoj majetkovej štruktúry",
    description:
      "Sledujte, ako sa mení pomer dlhodobého a krátkodobého majetku v čase. Vhodné pre panelové dáta za viacero období.",
    filters: "Obdobie (viac rokov), Veľkostná kategória",
    template: "Úč POD (699)",
    difficulty: "Pokročilá",
  },
  {
    title: "Porovnanie mikro a malých podnikov",
    description:
      "Využite stránku Porovnanie na analýzu rozdielov medzi šablónou MUJ (mikro účtovné jednotky) a POD (podnikatelia). Zistite, aké položky chýbajú v zjednodušenom výkaze.",
    filters: "Šablóna, Obdobie",
    template: "Obe šablóny (687 aj 699)",
    difficulty: "Základná",
  },
  {
    title: "Analýza likvidity podľa právnej formy",
    description:
      "Porovnajte krátkodobý majetok voči krátkodobým záväzkom u s.r.o. vs a.s. Identifikujte rozdiely v likviditnej pozícii.",
    filters: "Právna forma, Obdobie, Veľkostná kategória",
    template: "Úč POD (699)",
    difficulty: "Stredná",
  },
];

export default function NavodPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap className="w-8 h-8 text-teal-600" />
            <h1 className="text-2xl font-bold text-slate-800">
              Návod na používanie
            </h1>
          </div>
          <p className="text-slate-600">
            Sprievodca aplikáciou Register účtovných závierok pre študentov a
            výskumníkov. Nájdete tu popis funkcií, postup práce s dátami a
            tipy pre záverečné práce.
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        {/* Quick start */}
        <Section
          title="Rýchly štart — ako začať"
          icon={<BookOpen className="w-5 h-5" />}
          defaultOpen={true}
        >
          <p className="text-sm text-slate-600 mt-4 mb-4">
            Aplikácia poskytuje prístup k údajom z Registra účtovných závierok
            SR (registeruz.sk). Dáta sú licencované ako CC0 (voľne použiteľné)
            a automaticky sa synchronizujú s originálnym registrom.
          </p>

          <Step number={1} title="Zvoľte si výskumnú otázku">
            Premyslite si, čo chcete skúmať — regionálne rozdiely, sektorovú
            analýzu, vplyv veľkosti podniku, alebo časový vývoj. Pozrite si
            sekciu <strong>Námety na výskum</strong> nižšie.
          </Step>

          <Step number={2} title="Nastavte filtre na stránke Prehľad">
            Na hlavnej stránke{" "}
            <Link href="/" className="text-teal-600 underline">
              Prehľad
            </Link>{" "}
            vyberte filtre: kraj, veľkostnú kategóriu, právnu formu, SK NACE
            kód a obdobie. Výsledky sa zobrazia v tabuľke.
          </Step>

          <Step number={3} title="Preskúmajte riadkové dáta na stránke Výskum">
            Na stránke{" "}
            <Link href="/vyskum" className="text-teal-600 underline">
              Výskum
            </Link>{" "}
            si vyberte šablónu z ponuky (šablóny sú zoskupené podľa typu
            účtovnej jednotky — podnikatelia, ROPO, neziskové organizácie,
            banky a ďalšie). Potom vyberte konkrétnu tabuľku výkazu. Zobrazia
            sa vám štatistiky pre každý riadok výkazu.
          </Step>

          <Step number={4} title="Exportujte dáta do CSV/Excel">
            Na každej stránke nájdete tlačidlo <strong>Export</strong>. Dáta sa
            stiahnu vo formáte CSV, ktorý otvoríte v Exceli, SPSS, Stata alebo
            R/Python.
          </Step>

          <Tip>
            Ak ešte prebieha synchronizácia dát (vidíte ukazovateľ na hlavnej
            stránke), výsledky môžu byť neúplné. Po dokončení synchronizácie
            budú k dispozícii všetky dáta z registra.
          </Tip>
        </Section>

        {/* Pages overview */}
        <Section
          title="Popis stránok aplikácie"
          icon={<Search className="w-5 h-5" />}
        >
          <div className="space-y-6 mt-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-teal-600" />
                <h4 className="font-medium text-slate-800">
                  <Link href="/" className="text-teal-600 underline">
                    Prehľad
                  </Link>
                </h4>
              </div>
              <p className="text-sm text-slate-600 ml-6">
                Hlavná stránka s prehľadom účtovných závierok a účtovných
                jednotiek. Umožňuje filtrovanie podľa regiónu, veľkosti, právnej
                formy, SK NACE a obdobia. Zobrazuje základné údaje o závierke
                (typ, obdobie, celkový majetok, čistý príjem) a ponúka export.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <h4 className="font-medium text-slate-800">
                  <Link href="/vyskum" className="text-teal-600 underline">
                    Výskum
                  </Link>
                </h4>
              </div>
              <p className="text-sm text-slate-600 ml-6">
                Stránka pre detailnú analýzu riadkových dát účtovných výkazov.
                Vyberte si šablónu a tabuľku (Aktíva, Pasíva, Výkaz ziskov a
                strát). Pre každý riadok výkazu sa zobrazí štatistika: počet
                záznamov, priemer, medián, smerodajná odchýlka, minimum a
                maximum. Umožňuje aj zobrazenie surových dát s paginovaním.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <GitCompare className="w-4 h-4 text-teal-600" />
                <h4 className="font-medium text-slate-800">
                  <Link href="/porovnanie" className="text-teal-600 underline">
                    Porovnanie
                  </Link>
                </h4>
              </div>
              <p className="text-sm text-slate-600 ml-6">
                Porovnanie šablón Úč MUJ (687, pre mikro účtovné jednotky) a Úč
                POD (699, pre malé a veľké podniky). Zobrazuje, ktoré riadky
                výkazov sú porovnateľné medzi šablónami a aké sú rozdiely v
                štatistikách. Farebne odlíšené riadky: zelené = plne
                porovnateľné, žlté = čiastočne porovnateľné.
              </p>
            </div>
          </div>
        </Section>

        {/* Templates explained */}
        <Section
          title="Šablóny účtovných závierok"
          icon={<FileSpreadsheet className="w-5 h-5" />}
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              V slovenskom účtovnom systéme existujú rôzne šablóny (formuláre)
              účtovných závierok podľa typu účtovnej jednotky. Formuláre sú
              stanovené opatreniami MF SR. Účtovné jednotky ich vypĺňajú a
              posielajú na finančnú správu v XML formáte. V registri sú dáta
              dostupné cez API v JSON formáte. Aplikácia podporuje tieto hlavné
              kategórie:
            </p>

            <h4 className="font-semibold text-slate-800 mt-4">
              1. Podnikatelia (podvojné účtovníctvo)
            </h4>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">
                Úč MUJ — šablóna 687 (~237 tis. závierok)
              </h4>
              <p className="text-sm text-slate-600 mb-2">
                Určená pre <strong>mikro účtovné jednotky</strong>. Zjednodušený
                výkaz s menším počtom riadkov. Každý riadok má 2 stĺpce dát:
                Netto bežné obdobie a Netto predchádzajúce obdobie.
                Novšia verzia: šablóna 5181 (od 2023).
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">
                Úč POD — šablóna 699 (~235 tis. závierok)
              </h4>
              <p className="text-sm text-slate-600 mb-2">
                Určená pre <strong>malé a veľké účtovné jednotky</strong>.
                Podrobnejší výkaz. Tabuľka aktív má 4 stĺpce dát (Brutto,
                Korekcia, Netto bežné, Netto predchádzajúce). Pasíva a VZaS
                majú 2 stĺpce. Novšia verzia: šablóna 5184 (od 2023).
              </p>
            </div>

            <h4 className="font-semibold text-slate-800 mt-4">
              2. Rozpočtové a príspevkové organizácie (ROPO)
            </h4>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">
                Súvaha ROPO — šablóna 21 + VZaS ROPO — šablóna 22 (~53 tis.
                závierok každá)
              </h4>
              <p className="text-sm text-slate-600 mb-2">
                Pre rozpočtové organizácie, príspevkové organizácie, štátne
                fondy, obce a VÚC. Súvaha (65r aktíva + 60r pasíva) je
                v štruktúre podobnej Úč POD. VZaS (61r) je separátna šablóna.
                Novšie verzie: šablóna 1164 (od 2022).
              </p>
            </div>

            <h4 className="font-semibold text-slate-800 mt-4">
              3. Neziskové účtovné jednotky (NÚJ)
            </h4>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="font-medium text-slate-800 mb-2">
                Úč NÚJ — šablóna 943 (~416 závierok)
              </h4>
              <p className="text-sm text-slate-600 mb-2">
                Pre občianske združenia, nadácie, neziskové organizácie, cirkvi
                a pod. Obsahuje súvahu (36r), pohľadávky a záväzky po lehote
                splatnosti, VZaS (37r) a daň z príjmov. Novšia verzia: 5183
                (od 2023).
              </p>
            </div>

            <h4 className="font-semibold text-slate-800 mt-4">
              4. Finančné inštitúcie
            </h4>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-600">
                <strong>Banky</strong> — šablóna 1121 (od 2019), 5181 (od 2023)
                — špecifický formát s pohľadávkami, finančnými nástrojmi,
                úrokovými výnosmi/nákladmi.
              </p>
              <p className="text-sm text-slate-600">
                <strong>Poisťovne</strong> — šablóna 942 — rozsiahly formát
                (8 tabuliek) vrátane technických účtov životného a neživotného
                poistenia.
              </p>
              <p className="text-sm text-slate-600">
                <strong>Zdravotné poisťovne</strong> — šablóna 1101 — špeciálny
                formát s technickým účtom zdravotného poistenia.
              </p>
            </div>

            <h4 className="font-semibold text-slate-800 mt-4">
              5. Jednoduché účtovníctvo
            </h4>

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600">
                <strong>Úč FO — šablóna 716</strong> — pre SZČO. Obsahuje
                príjmy (4r), výdavky (8r), majetok (15r) a záväzky (6r).
                <br />
                <strong>Neziskové organizácie — šablóna 383</strong> — príjmy
                (16r), výdavky (11r), majetok (11r) a záväzky (6r).
              </p>
            </div>

            <Tip>
              Pri výskume dávajte pozor na to, že rôzne typy organizácií majú
              rôzne formuláre a nie sú priamo porovnateľné. Ak porovnávate
              rovnaký typ (napr. MUJ vs POD), použite stránku Porovnanie, ktorá
              zobrazuje mapovanie medzi šablónami. Pri porovnávaní stĺpcov
              vždy používajte <strong>Netto bežné obdobie</strong>.
            </Tip>
          </div>
        </Section>

        {/* Filters explained */}
        <Section
          title="Ako používať filtre"
          icon={<Filter className="w-5 h-5" />}
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Filtre vám umožňujú zúžiť výber dát na práve tú podmnožinu, ktorú
              potrebujete pre váš výskum.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-4 py-2 text-left font-medium text-slate-700">
                      Filter
                    </th>
                    <th className="border border-slate-200 px-4 py-2 text-left font-medium text-slate-700">
                      Popis
                    </th>
                    <th className="border border-slate-200 px-4 py-2 text-left font-medium text-slate-700">
                      Príklad použitia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-200 px-4 py-2 font-medium">
                      Kraj
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Región sídla účtovnej jednotky
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Regionálna analýza, porovnanie BA vs BB kraj
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-4 py-2 font-medium">
                      Veľkostná kategória
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Mikro, malá, veľká účtovná jednotka
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Vplyv veľkosti na finančné ukazovatele
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-4 py-2 font-medium">
                      Právna forma
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      s.r.o., a.s., SZČO, družstvo atď.
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Porovnanie štruktúry kapitálu podľa právnej formy
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-4 py-2 font-medium">
                      SK NACE
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Klasifikácia ekonomických činností
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Sektorová analýza (výroba vs služby vs IT)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-4 py-2 font-medium">
                      Obdobie
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Rok účtovnej závierky (od — do)
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Časový vývoj, panelové dáta, vplyv pandémie (2019–2022)
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-4 py-2 font-medium">
                      Typ závierky
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Riadna, mimoriadna, priebežná
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Väčšinou chcete len riadne závierky
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-200 px-4 py-2 font-medium">
                      Šablóna
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Úč MUJ (687) alebo Úč POD (699)
                    </td>
                    <td className="border border-slate-200 px-4 py-2 text-slate-600">
                      Voľba podľa veľkosti skúmaných podnikov
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Tip>
              Pre záverečnú prácu odporúčame vždy filtrovať aj podľa{" "}
              <strong>typu závierky = riadna</strong>, aby ste vylúčili
              mimoriadne a priebežné závierky, ktoré by skresľovali výsledky.
            </Tip>
          </div>
        </Section>

        {/* Export guide */}
        <Section
          title="Export dát a práca v Exceli / štatistickom softvéri"
          icon={<Download className="w-5 h-5" />}
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Exportované CSV súbory môžete otvoriť a spracovať v rôznych
              nástrojoch:
            </p>

            <div className="space-y-3">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-1">
                  Microsoft Excel
                </h4>
                <p className="text-sm text-slate-600">
                  Otvorte CSV cez <em>Údaje → Z textu/CSV</em>. Nastavte
                  kódovanie na UTF-8 a oddeľovač na čiarku alebo bodkočiarku
                  (podľa lokalizácie). V Exceli môžete vytvoriť kontingenčné
                  tabuľky, grafy a základné štatistiky.
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-1">
                  IBM SPSS Statistics
                </h4>
                <p className="text-sm text-slate-600">
                  Importujte CSV cez <em>File → Read Text Data</em>. SPSS je
                  vhodný na deskriptívnu štatistiku, regresiu, ANOVA,
                  korelácie a ďalšie pokročilé analýzy.
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-1">
                  R / RStudio
                </h4>
                <p className="text-sm text-slate-600">
                  Načítajte dáta príkazom{" "}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">
                    read.csv(&quot;export.csv&quot;)
                  </code>
                  . R je ideálny pre pokročilé štatistické modelovanie,
                  vizualizácie (ggplot2) a reprodukovateľný výskum.
                </p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-1">
                  Python (pandas)
                </h4>
                <p className="text-sm text-slate-600">
                  Načítajte dáta príkazom{" "}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">
                    pd.read_csv(&quot;export.csv&quot;)
                  </code>
                  . Python s knižnicami pandas, matplotlib a scikit-learn je
                  silný nástroj pre analýzu veľkých dátových súborov.
                </p>
              </div>
            </div>

            <Tip>
              CSV export obsahuje všetky riadky podľa aktuálnych filtrov. Pri
              veľkých dátových setoch (tisíce záznamov) môže sťahovanie trvať
              niekoľko sekúnd. Exportované dáta sú vždy aktuálne k poslednému
              dátumu synchronizácie.
            </Tip>
          </div>
        </Section>

        {/* Research ideas */}
        <Section
          title="Námety na výskum pre záverečné práce"
          icon={<Lightbulb className="w-5 h-5" />}
        >
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Tu je niekoľko námetov, ako môžete využiť dáta z registra vo
              svojej bakalárskej alebo diplomovej práci. Každý námet obsahuje
              odporúčané filtre a úroveň náročnosti.
            </p>

            <div className="grid gap-4">
              {RESEARCH_IDEAS.map((idea, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h4 className="font-medium text-slate-800">{idea.title}</h4>
                    <span
                      className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        idea.difficulty === "Základná"
                          ? "bg-green-100 text-green-700"
                          : idea.difficulty === "Stredná"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {idea.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">
                    {idea.description}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <span>
                      <strong>Filtre:</strong> {idea.filters}
                    </span>
                    <span>
                      <strong>Šablóna:</strong> {idea.template}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <Tip>
              Tieto námety sú len východiskové. Najlepšie výskumné otázky
              vznikajú kombináciou niekoľkých prístupov. Napríklad môžete
              spojiť regionálnu analýzu so sektorovou a skúmať, či je IT sektor
              rentabilnejší v Bratislave ako v Košiciach.
            </Tip>
          </div>
        </Section>

        {/* Methodology tips */}
        <Section
          title="Metodologické odporúčania"
          icon={<GraduationCap className="w-5 h-5" />}
        >
          <div className="mt-4 space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-slate-800 mb-1">
                  Zdroj a citácia dát
                </h4>
                <p className="text-sm text-slate-600">
                  Dáta pochádzajú z Registra účtovných závierok SR
                  (registeruz.sk), spravovaného Ministerstvom financií SR. Dáta
                  sú publikované pod licenciou CC0 (verejné vlastníctvo).
                  V práci citujte ako: <em>„Register účtovných závierok SR,
                  Ministerstvo financií SR, dostupné na registeruz.sk"</em>.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-1">
                  Veľkosť vzorky a výber
                </h4>
                <p className="text-sm text-slate-600">
                  Register obsahuje údaje o takmer 2 miliónoch účtovných
                  jednotiek. Pre záverečnú prácu nemusíte použiť všetky —
                  vyberte si relevantnú podmnožinu podľa filtrov. V metodológii
                  uveďte, aké kritériá výberu ste použili a koľko záznamov
                  spĺňalo podmienky.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-1">
                  Čistenie dát
                </h4>
                <p className="text-sm text-slate-600">
                  Skontrolujte exportované dáta na chýbajúce hodnoty (NULL),
                  extrémne odľahlé hodnoty (outliers) a duplicity. V práci
                  opíšte, ako ste s nimi naložili (vylúčenie, winzorizácia,
                  nahradenie mediánom atď.).
                </p>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-1">
                  Porovnávanie šablón
                </h4>
                <p className="text-sm text-slate-600">
                  Ak porovnávate mikro podniky (MUJ) s malými/veľkými (POD),
                  buďte opatrní — šablóny majú rôzny počet riadkov a niektoré
                  položky nie sú priamo porovnateľné. Stránka Porovnanie
                  zobrazuje mapovanie a farebne odlišuje plne a čiastočne
                  porovnateľné položky.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-slate-800 mb-1">
                  Štatistické ukazovatele
                </h4>
                <p className="text-sm text-slate-600">
                  Aplikácia počíta: priemer, medián, smerodajnú odchýlku, Q1,
                  Q3, minimum a maximum. Pre finančné dáta je medián často
                  lepším ukazovateľom centrálnej tendencie ako priemer, pretože
                  distribúcia je zvyčajne zošikmená.
                </p>
              </div>
            </div>

            <Tip>
              Vo výskumnej časti práce vždy zdôvodnite výber štatistických
              metód. Napríklad prečo používate medián namiesto priemeru, alebo
              prečo ste vylúčili outliers nad 99. percentilom.
            </Tip>
          </div>
        </Section>

        {/* Data source info */}
        <Section
          title="O zdroji dát"
          icon={<Database className="w-5 h-5" />}
        >
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>
              <strong>Register účtovných závierok</strong> je informačný systém
              verejnej správy, v ktorom sa ukladajú účtovné závierky, výročné
              správy a správy audítorov. Správcom registra je Ministerstvo
              financií SR, prevádzkovateľom je DataCentrum.
            </p>
            <p>
              <strong>API prístup:</strong> Dáta sú dostupné cez otvorené API
              (REST) na adrese registeruz.sk/cruz-public/api/. Aplikácia
              používa toto API na automatickú synchronizáciu dát.
            </p>
            <p>
              <strong>Licencia:</strong> Dáta sú publikované pod licenciou CC0
              1.0 Universal, čo znamená, že ich môžete voľne používať na
              výskumné, akademické aj komerčné účely bez obmedzení.
            </p>
            <p>
              <strong>Aktuálnosť:</strong> Aplikácia sa pravidelne
              synchronizuje s registrom. Nové účtovné závierky sa v registri
              objavujú priebežne počas celého roka, s najvyššou koncentráciou
              v mesiacoch apríl — júl (po zákonnej lehote na podanie).
            </p>
          </div>
        </Section>

        {/* Quick links */}
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6">
          <h3 className="font-semibold text-teal-800 mb-4">
            Rýchle odkazy na stránky aplikácie
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-teal-200 hover:border-teal-400 transition-colors"
            >
              <Database className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-slate-800">Prehľad</span>
              <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
            </Link>
            <Link
              href="/vyskum"
              className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-teal-200 hover:border-teal-400 transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-slate-800">Výskum</span>
              <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
            </Link>
            <Link
              href="/porovnanie"
              className="flex items-center gap-2 bg-white rounded-lg px-4 py-3 border border-teal-200 hover:border-teal-400 transition-colors"
            >
              <GitCompare className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-slate-800">Porovnanie</span>
              <ArrowRight className="w-4 h-4 text-slate-400 ml-auto" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
