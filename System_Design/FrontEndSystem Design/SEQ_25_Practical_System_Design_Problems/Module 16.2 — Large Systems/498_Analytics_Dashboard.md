# 498 – Analytics Dashboard Frontend

────────────────────────────────────────────────────────────

## 1. ⚡ HIGH-LEVEL EXPLANATION (Interview Opening Answer)

An analytics dashboard (Google Analytics, Amplitude, Mixpanel) tests **large dataset visualization** (millions of rows aggregated into charts), **complex filtering and drill-down** (time ranges, segments, cohorts), **responsive chart rendering** (SVG for interactive, Canvas for dense data), **shareable dashboard state** (URL-serialized filters), **data fetching orchestration** (parallel queries, loading states per widget), and **export capabilities** (PDF, CSV, scheduled reports). The key challenge is rendering responsive, interactive charts over aggregated data while handling complex filter combinations and keeping the UI responsive during heavy queries.

────────────────────────────────────────────────────────────

## 2. 🔬 DEEP-DIVE EXPLANATION (Senior/Staff Level)

### Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  Analytics Dashboard Shell                     │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Global Filters: Date Range | Segment | Comparison        ││
│  ├──────────────────────────────────────────────────────────┤│
│  │                                                          ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   ││
│  │  │ KPI Card │ │ KPI Card │ │ KPI Card │ │ KPI Card │   ││
│  │  │ Users    │ │ Sessions │ │ Bounce   │ │ Revenue  │   ││
│  │  │ 1.2M ▲5% │ │ 3.4M ▼2%│ │ 42% ▲1% │ │ $2.3M ▲8%│   ││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   ││
│  │                                                          ││
│  │  ┌─────────────────────────────┐ ┌───────────────────┐  ││
│  │  │ Time-Series Line Chart      │ │ Pie/Donut Chart   │  ││
│  │  │ (Sessions over time)        │ │ (Traffic sources)  │  ││
│  │  │    📈 ──────────            │ │    🟦 Direct 35%  │  ││
│  │  │                             │ │    🟩 Organic 28% │  ││
│  │  └─────────────────────────────┘ └───────────────────┘  ││
│  │                                                          ││
│  │  ┌──────────────────────────────────────────────────┐   ││
│  │  │ Data Table (Virtualized, Sortable, Filterable)    │   ││
│  │  │ Page Path         | Sessions | Bounce | Avg Time  │   ││
│  │  │ /home             | 245,000  | 38%    | 2m 15s    │   ││
│  │  │ /products/shoes   | 180,000  | 42%    | 3m 02s    │   ││
│  │  └──────────────────────────────────────────────────┘   ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

### Filter State & URL Serialization

```typescript
interface DashboardFilters {
  dateRange: { start: string; end: string };  // ISO dates
  comparison?: { start: string; end: string }; // previous period
  granularity: 'hour' | 'day' | 'week' | 'month';
  segment?: string;            // e.g., "country=US"
  metrics: string[];           // e.g., ["sessions", "users", "revenue"]
  dimensions: string[];        // e.g., ["page_path", "source"]
}

// ──── Serialize filters to URL for shareable dashboards ────
function filtersToUrl(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  params.set('start', filters.dateRange.start);
  params.set('end', filters.dateRange.end);
  params.set('gran', filters.granularity);
  if (filters.segment) params.set('seg', filters.segment);
  params.set('metrics', filters.metrics.join(','));
  params.set('dims', filters.dimensions.join(','));
  return `?${params.toString()}`;
}

function urlToFilters(search: string): DashboardFilters {
  const params = new URLSearchParams(search);
  return {
    dateRange: {
      start: params.get('start') ?? defaultStart(),
      end: params.get('end') ?? defaultEnd(),
    },
    granularity: (params.get('gran') as any) ?? 'day',
    segment: params.get('seg') ?? undefined,
    metrics: params.get('metrics')?.split(',') ?? ['sessions'],
    dimensions: params.get('dims')?.split(',') ?? ['page_path'],
  };
}

// Sync URL ↔ state
function useDashboardFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => urlToFilters(searchParams.toString()), [searchParams]);

  const setFilters = (next: Partial<DashboardFilters>) => {
    const merged = { ...filters, ...next };
    setSearchParams(filtersToUrl(merged));
  };

  return { filters, setFilters };
}
```

### Parallel Widget Data Fetching

```typescript
// ──── Each widget fetches its own data, in parallel ────
function Dashboard() {
  const { filters } = useDashboardFilters();

  return (
    <>
      <GlobalFilterBar filters={filters} />
      <div className="dashboard-grid">
        {/* All queries fire in parallel when filters change */}
        <KPICards filters={filters} />
        <TimeSeriesChart filters={filters} />
        <TrafficSourceChart filters={filters} />
        <PageTable filters={filters} />
      </div>
    </>
  );
}

function KPICards({ filters }: { filters: DashboardFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['kpis', filters],
    queryFn: () => fetchKPIs(filters),
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true, // show old data while fetching new
  });

  if (isLoading) return <KPICardsSkeleton />;

  return (
    <div className="kpi-row" role="list" aria-label="Key metrics">
      {data?.map(kpi => (
        <div key={kpi.metric} role="listitem" className="kpi-card">
          <span className="kpi-label">{kpi.label}</span>
          <span className="kpi-value">{formatNumber(kpi.value)}</span>
          <span className={`kpi-delta ${kpi.delta >= 0 ? 'up' : 'down'}`}>
            {kpi.delta >= 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}%
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Chart Component: SVG vs Canvas Decision

```typescript
// ──── Time-Series Chart with adaptive rendering ────
function TimeSeriesChart({ filters }: { filters: DashboardFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['timeseries', filters],
    queryFn: () => fetchTimeSeries(filters),
    keepPreviousData: true,
  });

  // Auto-select renderer based on data density
  const dataPoints = data?.series?.[0]?.values?.length ?? 0;
  const useCanvas = dataPoints > 500;

  if (isLoading) return <ChartSkeleton />;

  if (useCanvas) {
    // Canvas: fast for dense data, no hover per-point
    return (
      <CanvasLineChart
        data={data!.series}
        width={800}
        height={400}
        xAxis={data!.timeLabels}
      />
    );
  }

  return (
    // SVG: interactive for sparse data, tooltip per-point
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data!.series}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        {data!.series.map((s, i) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey="value"
            data={s.values}
            stroke={COLORS[i]}
            dot={dataPoints < 100}  // hide dots for dense series
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Data Table with Virtualization, Sort, and Export

```typescript
function PageTable({ filters }: { filters: DashboardFilters }) {
  const { data, isLoading } = useQuery({
    queryKey: ['page-table', filters],
    queryFn: () => fetchPageReport(filters),
  });

  const [sortConfig, setSortConfig] = useState<{ key: string; dir: 'asc' | 'desc' }>({
    key: 'sessions', dir: 'desc',
  });

  const sorted = useMemo(() => {
    if (!data?.rows) return [];
    return [...data.rows].sort((a, b) => {
      const val = sortConfig.dir === 'asc'
        ? a[sortConfig.key] - b[sortConfig.key]
        : b[sortConfig.key] - a[sortConfig.key];
      return val;
    });
  }, [data, sortConfig]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 20,
  });

  const exportCSV = () => {
    const csv = [
      Object.keys(sorted[0]).join(','),
      ...sorted.map(row => Object.values(row).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${filters.dateRange.start}-${filters.dateRange.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="table-actions">
        <button onClick={exportCSV}>Export CSV</button>
      </div>
      <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}
           role="table" aria-label="Page performance">
        <div role="rowgroup">
          <div role="row" className="table-header">
            {columns.map(col => (
              <button key={col.key} role="columnheader"
                      onClick={() => setSortConfig({ key: col.key, dir: sortConfig.dir === 'asc' ? 'desc' : 'asc' })}
                      aria-sort={sortConfig.key === col.key ? (sortConfig.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                {col.label} {sortConfig.key === col.key && (sortConfig.dir === 'asc' ? '▲' : '▼')}
              </button>
            ))}
          </div>
        </div>
        <div role="rowgroup" style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map(vRow => (
            <div key={vRow.index} role="row" ref={virtualizer.measureElement}
                 data-index={vRow.index}
                 style={{ position: 'absolute', top: 0, transform: `translateY(${vRow.start}px)`, width: '100%' }}>
              {columns.map(col => (
                <span key={col.key} role="cell">{formatCell(sorted[vRow.index][col.key], col.type)}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Anti-Patterns

- ❌ Single API call for entire dashboard → one slow query blocks everything. Parallel per-widget queries.
- ❌ All data client-side → transfer millions of rows. Always aggregate server-side.
- ❌ SVG for 10K+ data points → janky. Switch to Canvas for dense charts.
- ❌ Filter changes without URL sync → users can't share or bookmark dashboard views.
- ❌ No `keepPreviousData` → charts flash empty during refetch. Keep stale data visible.
- ❌ Blocking CSV export → use Web Workers for large dataset serialization.

────────────────────────────────────────────────────────────

## 3. 🌍 REAL-WORLD EXAMPLES

### Google Analytics
- Server-side aggregation with BigQuery backend
- Dashboard state fully serialized in URL
- Chart rendering: SVG for standard, Canvas for high-density reports
- Scheduled email reports (PDF export)

### Grafana
- Plugin-based panel system (each panel = independent data source + renderer)
- Time-series focus with configurable refresh intervals
- Dashboard-as-code (JSON model, version controlled)

────────────────────────────────────────────────────────────

## 4. 🎯 INTERVIEW-ORIENTED ANSWER

### Sample Answer

*"I'd design an analytics dashboard with three core principles: parallel data fetching per widget, URL-serialized filter state, and adaptive chart rendering.*

*Filters: Global filter bar (date range, segment, granularity) stored in URL search params via `useSearchParams`. Every filter change updates the URL, which triggers all widget queries in parallel. `keepPreviousData` in TanStack Query keeps charts visible during refetch.*

*Charts: SVG (Recharts) for < 500 data points (interactive tooltips per-point). Canvas for > 500 points (fast rendering, aggregated tooltips). KPI cards with delta indicators (▲/▼ vs previous period).*

*Data Tables: Virtualized with @tanstack/virtual (40px row height). Client-side sort with `useMemo`. CSV export via Blob URL. For very large exports, use a Web Worker to avoid blocking the main thread.*

*At SAP, our Fiori analytics dashboards used the same pattern — parallel OData queries per tile, URL-bookmarkable filter state, and we switched from SVG to Canvas charts when data density exceeded 1000 points."*

────────────────────────────────────────────────────────────

## 5. ✅ WHY & HOW SUMMARY

**Why:** Analytics dashboard is a common system design question — tests data visualization, parallel fetching, complex state management, and UX patterns for data-heavy apps.
**How:** URL-serialized filters → parallel per-widget queries → adaptive SVG/Canvas chart rendering → virtualized data table → CSV/PDF export → keepPreviousData for smooth transitions.
**Companies:** Google (GA4), Amplitude, Mixpanel, Datadog, Microsoft (Power BI), Salesforce (Einstein Analytics).
