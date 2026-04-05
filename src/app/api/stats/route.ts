import { NextRequest, NextResponse } from "next/server";
import { query, queryRows } from "@/lib/db-raw";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats - Get statistical aggregations suitable for charts
 *
 * Query Parameters:
 * - groupBy: string - Field to group by (kraj, okres, velkostOrganizacie, skNace, pravnaForma, typ, rok)
 * - metric: string (default: "count") - Aggregation metric (count, sum, avg)
 * - entityType: string (default: "entities") - Type to aggregate (entities | statements)
 */

type GroupByField =
  | "kraj"
  | "okres"
  | "velkostOrganizacie"
  | "skNace"
  | "pravnaForma"
  | "typ"
  | "rok";
type MetricType = "count" | "sum" | "avg";
type EntityType = "entities" | "statements";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const groupBy = (searchParams.get("groupBy") || "kraj") as GroupByField;
    const metric = ((searchParams.get("metric") || "count") as MetricType).toLowerCase();
    const entityType = ((searchParams.get("entityType") || "entities") as EntityType).toLowerCase();

    if (!isValidGroupBy(groupBy)) {
      return NextResponse.json(
        {
          error: "Invalid groupBy parameter. Must be one of: kraj, okres, velkostOrganizacie, skNace, pravnaForma, typ, rok",
        },
        { status: 400 }
      );
    }

    if (!isValidMetric(metric)) {
      return NextResponse.json(
        { error: "Invalid metric parameter. Must be one of: count, sum, avg" },
        { status: 400 }
      );
    }

    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: "Invalid entityType parameter. Must be one of: entities, statements" },
        { status: 400 }
      );
    }

    let stats: any[] = [];

    if (entityType === "entities") {
      stats = await getEntityStats(groupBy, metric);
    } else {
      stats = await getStatementStats(groupBy, metric);
    }

    return NextResponse.json(
      {
        groupBy,
        metric,
        entityType,
        data: stats,
        totalGroups: stats.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function getEntityStats(groupBy: GroupByField, metric: MetricType): Promise<any[]> {
  switch (groupBy) {
    case "kraj":
      return queryRows(
        `SELECT e."krajKod" as kod, k.nazov, COUNT(*) as count
         FROM "AccountingEntity" e
         LEFT JOIN "Kraj" k ON e."krajKod" = k.kod
         WHERE e.zmazpiznakana = false AND e."krajKod" IS NOT NULL
         GROUP BY e."krajKod", k.nazov
         ORDER BY count DESC`
      );
    case "okres":
      return queryRows(
        `SELECT e."okresKod" as kod, o.nazov, COUNT(*) as count
         FROM "AccountingEntity" e
         LEFT JOIN "Okres" o ON e."okresKod" = o.kod
         WHERE e.zmazpiznakana = false AND e."okresKod" IS NOT NULL
         GROUP BY e."okresKod", o.nazov
         ORDER BY count DESC`
      );
    case "velkostOrganizacie":
      return queryRows(
        `SELECT e."velkostOrganizacieKod" as kod, v.nazov, COUNT(*) as count
         FROM "AccountingEntity" e
         LEFT JOIN "VelkostOrganizacie" v ON e."velkostOrganizacieKod" = v.kod
         WHERE e.zmazpiznakana = false AND e."velkostOrganizacieKod" IS NOT NULL
         GROUP BY e."velkostOrganizacieKod", v.nazov
         ORDER BY count DESC`
      );
    case "skNace":
      return queryRows(
        `SELECT e."skNaceKod" as kod, s.nazov, COUNT(*) as count
         FROM "AccountingEntity" e
         LEFT JOIN "SkNace" s ON e."skNaceKod" = s.kod
         WHERE e.zmazpiznakana = false AND e."skNaceKod" IS NOT NULL
         GROUP BY e."skNaceKod", s.nazov
         ORDER BY count DESC`
      );
    case "pravnaForma":
      return queryRows(
        `SELECT e."pravnaFormaKod" as kod, p.nazov, COUNT(*) as count
         FROM "AccountingEntity" e
         LEFT JOIN "PravnaForma" p ON e."pravnaFormaKod" = p.kod
         WHERE e.zmazpiznakana = false AND e."pravnaFormaKod" IS NOT NULL
         GROUP BY e."pravnaFormaKod", p.nazov
         ORDER BY count DESC`
      );
    case "rok":
      return queryRows(
        `SELECT EXTRACT(YEAR FROM "datumZalozenia")::int as rok, COUNT(*) as count
         FROM "AccountingEntity"
         WHERE zmazpiznakana = false AND "datumZalozenia" IS NOT NULL
         GROUP BY rok
         ORDER BY rok`
      );
    default:
      return [];
  }
}

async function getStatementStats(groupBy: GroupByField, metric: MetricType): Promise<any[]> {
  switch (groupBy) {
    case "kraj":
      return queryRows(
        `SELECT e."krajKod" as kod, k.nazov, COUNT(*) as count
         FROM "FinancialStatement" fs
         JOIN "AccountingEntity" e ON fs."idUJ" = e.id
         LEFT JOIN "Kraj" k ON e."krajKod" = k.kod
         WHERE fs.zmazana = false AND e."krajKod" IS NOT NULL
         GROUP BY e."krajKod", k.nazov
         ORDER BY count DESC`
      );
    case "okres":
      return queryRows(
        `SELECT e."okresKod" as kod, o.nazov, COUNT(*) as count
         FROM "FinancialStatement" fs
         JOIN "AccountingEntity" e ON fs."idUJ" = e.id
         LEFT JOIN "Okres" o ON e."okresKod" = o.kod
         WHERE fs.zmazana = false AND e."okresKod" IS NOT NULL
         GROUP BY e."okresKod", o.nazov
         ORDER BY count DESC`
      );
    case "typ":
      return queryRows(
        `SELECT typ, COUNT(*) as count
         FROM "FinancialStatement"
         WHERE zmazana = false AND typ IS NOT NULL
         GROUP BY typ
         ORDER BY count DESC`
      );
    case "rok":
      return queryRows(
        `SELECT LEFT("obdobieDo", 4)::int as rok, COUNT(*) as count
         FROM "FinancialStatement"
         WHERE zmazana = false AND "obdobieDo" IS NOT NULL
         GROUP BY rok
         ORDER BY rok`
      );
    default:
      return [];
  }
}

function isValidGroupBy(field: string): field is GroupByField {
  const valid: GroupByField[] = ["kraj", "okres", "velkostOrganizacie", "skNace", "pravnaForma", "typ", "rok"];
  return valid.includes(field as GroupByField);
}

function isValidMetric(metric: string): metric is MetricType {
  const valid: MetricType[] = ["count", "sum", "avg"];
  return valid.includes(metric as MetricType);
}

function isValidEntityType(type: string): type is EntityType {
  const valid: EntityType[] = ["entities", "statements"];
  return valid.includes(type as EntityType);
}
