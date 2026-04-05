'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Filter, Download } from 'lucide-react';

interface StatisticsData {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  median: number;
  stddev: number;
  q1: number;
  q3: number;
}

interface ComparisonRow {
  mappingId: string;
  label: string;
  level: number;
  microRow: number | null;
  podRows: number[];
  micro: StatisticsData | null;
  pod: StatisticsData | null;
}

interface ComparisonResponse {
  table: string;
  templates: {
    micro: { id: number; name: string; reportCount: number };
    pod: { id: number; name: string; reportCount: number };
  };
  comparison: ComparisonRow[];
}

interface CodebookItem {
  kod: string;
  text: string;
}

interface Codebooks {
  kraje: CodebookItem[];
  pravneFormy: CodebookItem[];
  velkosti: CodebookItem[];
  skNace: CodebookItem[];
}

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('sk-SK', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const TableTabs = ({ activeTable, onChange }: { activeTable: string; onChange: (table: string) => void }) => {
  const tabs = [
    { id: 'aktiva', label: 'Aktíva' },
    { id: 'pasiva', label: 'Pasíva' },
    { id: 'vzas', label: 'VZaS' },
  ];

  return (
    <div className="flex border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-3 font-medium text-sm transition-colors ${
            activeTable === tab.id
              ? 'text-teal-600 border-b-2 border-teal-600'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

const LevelFilter = ({ level, onChange }: { level: number; onChange: (level: number) => void }) => {
  const levels = [
    { value: 0, label: 'Všetko' },
    { value: 1, label: 'Hlavné kategórie' },
    { value: 2, label: 'Podkategórie' },
  ];

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-slate-700">Úroveň hierarchie:</label>
      <select
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {levels.map((l) => (
          <option key={l.value} value={l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
};

const FilterPanel = ({
  isOpen,
  onToggle,
  filters,
  onFiltersChange,
  codebooks,
}: {
  isOpen: boolean;
  onToggle: () => void;
  filters: {
    region: string;
    district: string;
    legal_form: string;
    nace_code: string;
    period_from: string;
    period_to: string;
  };
  onFiltersChange: (filters: any) => void;
  codebooks: Codebooks | null;
}) => {
  const handleChange = (field: string, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-900 font-medium">
          <Filter className="w-5 h-5 text-teal-600" />
          Pokročilé filtre
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Kraj</label>
            <select
              value={filters.region}
              onChange={(e) => handleChange('region', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Všetky</option>
              {codebooks?.kraje.map((kraj) => (
                <option key={kraj.kod} value={kraj.kod}>
                  {kraj.text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Právna forma</label>
            <select
              value={filters.legal_form}
              onChange={(e) => handleChange('legal_form', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Všetky</option>
              {codebooks?.pravneFormy.map((forma) => (
                <option key={forma.kod} value={forma.kod}>
                  {forma.text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">NACE kód</label>
            <select
              value={filters.nace_code}
              onChange={(e) => handleChange('nace_code', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Všetky</option>
              {codebooks?.skNace.map((nace) => (
                <option key={nace.kod} value={nace.kod}>
                  {nace.kod} - {nace.text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rok od</label>
            <input
              type="number"
              value={filters.period_from}
              onChange={(e) => handleChange('period_from', e.target.value)}
              placeholder="2020"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rok do</label>
            <input
              type="number"
              value={filters.period_to}
              onChange={(e) => handleChange('period_to', e.target.value)}
              placeholder="2024"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCards = ({ data }: { data: ComparisonResponse | null }) => {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">{data.templates.micro.name}</h3>
        <p className="text-3xl font-bold text-teal-600">{data.templates.micro.reportCount.toLocaleString('sk-SK')}</p>
        <p className="text-sm text-slate-600 mt-1">výkazov zaradených</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">{data.templates.pod.name}</h3>
        <p className="text-3xl font-bold text-teal-600">{data.templates.pod.reportCount.toLocaleString('sk-SK')}</p>
        <p className="text-sm text-slate-600 mt-1">výkazov zaradených</p>
      </div>
    </div>
  );
};

const ComparisonChart = ({ data }: { data: ComparisonRow[] }) => {
  const chartData = data.filter((row) => row.level <= 1 && row.micro && row.pod).slice(0, 10);

  if (chartData.length === 0) return null;

  // Find max value for scaling
  const maxValue = Math.max(...chartData.map((row) => Math.max(row.micro?.avg || 0, row.pod?.avg || 0)));
  const scale = maxValue > 0 ? 100 / maxValue : 1;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
      <h3 className="font-semibold text-slate-900 mb-4">Porovnanie priemerov (EUR)</h3>
      <div className="space-y-6">
        {chartData.map((row) => (
          <div key={row.mappingId}>
            <p className="text-sm font-medium text-slate-900 mb-2 truncate">{row.label}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-20 text-xs text-slate-600 text-right">Úč MUJ</div>
                <div className="flex-1 bg-slate-100 rounded h-6 overflow-hidden">
                  <div
                    className="bg-teal-600 h-full transition-all"
                    style={{ width: `${(row.micro?.avg || 0) * scale}%` }}
                  />
                </div>
                <div className="w-32 text-xs text-slate-700 text-right">{formatCurrency(row.micro?.avg)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 text-xs text-slate-600 text-right">Úč POD</div>
                <div className="flex-1 bg-slate-100 rounded h-6 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full transition-all"
                    style={{ width: `${(row.pod?.avg || 0) * scale}%` }}
                  />
                </div>
                <div className="w-32 text-xs text-slate-700 text-right">{formatCurrency(row.pod?.avg)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ComparisonTable = ({ data }: { data: ComparisonRow[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-slate-600">Žiadne údaje na zobrazenie</p>
      </div>
    );
  }

  const getRowBackground = (row: ComparisonRow): string => {
    const microHasData = row.micro !== null;
    const podHasData = row.pod !== null;

    if (microHasData && podHasData) {
      return 'bg-green-50';
    } else if (microHasData || podHasData) {
      return 'bg-yellow-50';
    }
    return 'bg-white';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-semibold text-slate-900 min-w-64">Položka</th>
            <th colSpan={5} className="px-4 py-3 text-center font-semibold text-slate-900 border-l border-slate-200">
              Úč MUJ (Mikro)
            </th>
            <th colSpan={5} className="px-4 py-3 text-center font-semibold text-slate-900 border-l border-slate-200">
              Úč POD (Malé/Veľké)
            </th>
          </tr>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left"></th>
            <th className="px-3 py-3 text-right font-medium text-slate-700 border-l border-slate-200">Počet</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Priemer</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Medián</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Q1</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Q3</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700 border-l border-slate-200">Počet</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Priemer</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Medián</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Q1</th>
            <th className="px-3 py-3 text-right font-medium text-slate-700">Q3</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.mappingId} className={`border-b border-slate-200 ${getRowBackground(row)} hover:bg-opacity-75 transition-colors`}>
              <td
                className="px-4 py-3 text-slate-900 font-medium"
                style={{ paddingLeft: `${1 + row.level * 1.5}rem` }}
              >
                {row.label}
              </td>
              <td className="px-3 py-3 text-right text-slate-700 border-l border-slate-200">
                {row.micro ? formatNumber(row.micro.count) : '—'}
              </td>
              <td className="px-3 py-3 text-right text-slate-700">{row.micro ? formatCurrency(row.micro.avg) : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-700">{row.micro ? formatCurrency(row.micro.median) : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-700">{row.micro ? formatCurrency(row.micro.q1) : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-700">{row.micro ? formatCurrency(row.micro.q3) : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-700 border-l border-slate-200">
                {row.pod ? formatNumber(row.pod.count) : '—'}
              </td>
              <td className="px-3 py-3 text-right text-slate-700">{row.pod ? formatCurrency(row.pod.avg) : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-700">{row.pod ? formatCurrency(row.pod.median) : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-700">{row.pod ? formatCurrency(row.pod.q1) : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-700">{row.pod ? formatCurrency(row.pod.q3) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ExportButton = ({ data, table }: { data: ComparisonRow[]; table: string }) => {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const headers = [
      'Položka',
      'Úroveň',
      'Počet (Mikro)',
      'Priemer (Mikro)',
      'Medián (Mikro)',
      'Q1 (Mikro)',
      'Q3 (Mikro)',
      'Počet (POD)',
      'Priemer (POD)',
      'Medián (POD)',
      'Q1 (POD)',
      'Q3 (POD)',
    ];

    const rows = data.map((row) => [
      row.label,
      row.level,
      row.micro?.count ?? '',
      row.micro?.avg ?? '',
      row.micro?.median ?? '',
      row.micro?.q1 ?? '',
      row.micro?.q3 ?? '',
      row.pod?.count ?? '',
      row.pod?.avg ?? '',
      row.pod?.median ?? '',
      row.pod?.q1 ?? '',
      row.pod?.q3 ?? '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => (typeof cell === 'string' ? `"${cell}"` : cell)).join(';')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `porovnanie-sablony-${table}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </button>
  );
};

export default function PorovnaniePage() {
  const [activeTable, setActiveTable] = useState('aktiva');
  const [level, setLevel] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    region: '',
    district: '',
    legal_form: '',
    nace_code: '',
    period_from: '',
    period_to: '',
  });
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [codebooks, setCodebooks] = useState<Codebooks | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch codebooks on mount
  useEffect(() => {
    const fetchCodebooks = async () => {
      try {
        const response = await fetch('/api/cb');
        if (!response.ok) throw new Error('Failed to fetch codebooks');
        const result = await response.json();
        setCodebooks(result.codebooks);
      } catch (err) {
        console.error('Error fetching codebooks:', err);
      }
    };

    fetchCodebooks();
  }, []);

  // Fetch comparison data
  const fetchComparison = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        table: activeTable,
        level: level.toString(),
        ...(filters.region && { region: filters.region }),
        ...(filters.district && { district: filters.district }),
        ...(filters.legal_form && { legal_form: filters.legal_form }),
        ...(filters.nace_code && { nace_code: filters.nace_code }),
        ...(filters.period_from && { period_from: filters.period_from }),
        ...(filters.period_to && { period_to: filters.period_to }),
      });

      const response = await fetch(`/api/compare?${params}`);
      if (!response.ok) throw new Error('Failed to fetch comparison data');
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  }, [activeTable, level, filters]);

  // Fetch data when filters change
  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const filteredData = data?.comparison.filter((row) => row.level >= level) || [];

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Porovnanie šablón</h1>
          <p className="text-slate-600">Porovnanie finančných výkazov medzi Úč MUJ (mikro) a Úč POD (malé/veľké)</p>
        </div>

        {/* Controls */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            {/* Table Tabs */}
            <TableTabs activeTable={activeTable} onChange={setActiveTable} />

            {/* Level Filter and Export */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-4">
              <LevelFilter level={level} onChange={setLevel} />
              <ExportButton data={filteredData} table={activeTable} />
            </div>

            {/* Filter Panel */}
            <FilterPanel
              isOpen={filterOpen}
              onToggle={() => setFilterOpen(!filterOpen)}
              filters={filters}
              onFiltersChange={setFilters}
              codebooks={codebooks}
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <p className="text-slate-600 mt-3">Načítavam údaje...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">Chyba pri načítaní údajov</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && data && (
          <>
            {/* Summary Cards */}
            <SummaryCards data={data} />

            {/* Comparison Chart */}
            <ComparisonChart data={filteredData} />

            {/* Comparison Table */}
            <ComparisonTable data={filteredData} />

            {/* Legend */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                <span className="text-slate-700">Porovnateľné údaje (obidve šablóny)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                <span className="text-slate-700">Čiastočná dostupnosť</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-white border border-slate-200 rounded"></div>
                <span className="text-slate-700">Bez údajov</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
