// Entity (Účtovná jednotka)
export interface Entity {
  id: string;
  name: string;
  ico: string;
  legal_form: string;
  region: string;
  district: string;
  municipality: string;
  size: string;
  nace_code: string;
  nace_description: string;
  created_at: string;
}

// Statement (Účtovná závierka)
export interface Statement {
  id: string;
  entity_id: string;
  entity_name: string;
  statement_type: "Riadna" | "Mimoriadna" | "Priebežná";
  period_from: string;
  period_to: string;
  consolidated: boolean;
  filing_date: string;
  total_assets: number | null;
  total_liabilities: number | null;
  total_equity: number | null;
  net_income: number | null;
  url: string;
}

// Statistics Group
export interface StatGroup {
  key: string;
  label: string;
  count: number;
  value?: number;
}

// Codebook Data (for dropdowns)
export interface CodebookData {
  regions: Array<{ id: string; name: string }>;
  districts: Array<{ id: string; name: string; region_id: string }>;
  legal_forms: Array<{ id: string; name: string }>;
  sizes: Array<{ id: string; name: string }>;
  nace: Array<{ code: string; description: string }>;
}

// Paginated Response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// Filter Params
export interface FilterParams {
  search?: string;
  region?: string;
  district?: string;
  legal_form?: string;
  size?: string;
  nace_code?: string;
  statement_type?: string;
  template_id?: number;
  period_from?: number;
  period_to?: number;
  consolidated?: boolean;
  page?: number;
  limit?: number;
}

// Sync Status
export interface SyncStatus {
  last_sync: string | null;
  total_records: number;
  status: "idle" | "syncing" | "error";
  error_message?: string;
}

// Stats Response
export interface StatsResponse {
  data: StatGroup[];
  groupBy: string;
}

// Export Request
export interface ExportRequest {
  format: "csv" | "xlsx";
  filters: FilterParams;
}
