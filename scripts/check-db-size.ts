import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

async function checkDatabaseSize() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL is not set!');
    process.exit(1);
  }

  let prisma: PrismaClient;
  try {
    const adapter = new PrismaPg({ connectionString: dbUrl });
    prisma = new PrismaClient({ adapter });
    console.log('Connecting to PostgreSQL database...\n');
  } catch (err) {
    console.error('Failed to create Prisma client:', err);
    process.exit(1);
  }

  try {

    // Query 1: Total database size
    console.log('=== Total Database Size ===');
    const dbSizeResult = await prisma.$queryRaw<Array<{ total_size: string }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total_size
    `;
    console.log(`Total size: ${dbSizeResult[0]?.total_size}\n`);

    // Query 2: Top 20 largest tables
    console.log('=== Top 20 Largest Tables ===');
    const tablesResult = await prisma.$queryRaw<
      Array<{ schemaname: string; tablename: string; size: string; raw_size: number }>
    >`
      SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||quote_ident(tablename))) as size, pg_total_relation_size(schemaname||'.'||quote_ident(tablename)) as raw_size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY raw_size DESC
      LIMIT 20
    `;

    console.log('Table Name | Size');
    console.log('-'.repeat(50));
    tablesResult.forEach((row) => {
      console.log(`${row.tablename.padEnd(30)} | ${row.size}`);
    });
    console.log();

    // Query 3: AccountingEntity count
    console.log('=== Entity Counts ===');
    const accountingEntityResult = await prisma.$queryRaw<Array<{ entity_count: number }>>`
      SELECT COUNT(*) as entity_count FROM "AccountingEntity"
    `;
    console.log(`AccountingEntity count: ${accountingEntityResult[0]?.entity_count}`);

    // Query 4: FinancialStatement count
    const statementsResult = await prisma.$queryRaw<Array<{ statement_count: number }>>`
      SELECT COUNT(*) as statement_count FROM "FinancialStatement"
    `;
    console.log(`FinancialStatement count: ${statementsResult[0]?.statement_count}`);

    // Query 5: FinancialReport count
    const reportsResult = await prisma.$queryRaw<Array<{ report_count: number }>>`
      SELECT COUNT(*) as report_count FROM "FinancialReport"
    `;
    console.log(`FinancialReport count: ${reportsResult[0]?.report_count}`);

    // Query 6: ReportLineItem count
    const lineItemsResult = await prisma.$queryRaw<Array<{ line_item_count: number }>>`
      SELECT COUNT(*) as line_item_count FROM "ReportLineItem"
    `;
    console.log(`ReportLineItem count: ${lineItemsResult[0]?.line_item_count}\n`);

    console.log('Database analysis complete!');
  } catch (error) {
    console.error('Error connecting to database or running queries:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseSize();
