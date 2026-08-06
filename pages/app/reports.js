// pages/app/reports.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

import { BarChart } from '../../components/charts';

const REPORT_TYPES = [
  { key: 'by_customer', label: 'Sales & Margin by Customer' },
  { key: 'by_supplier', label: 'Sales & Margin by Supplier' },
  { key: 'by_commodity', label: 'Sales & Margin by Commodity' },
  { key: 'freight_summary', label: 'Freight Summary by Jacket' },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState('by_customer');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { runReport(); }, [reportType]);

  async function runReport() {
    setLoading(true);
    if (reportType === 'freight_summary') {
      await runFreightSummary();
    } else {
      await runSalesMargin(reportType);
    }
    setLoading(false);
  }

  async function runSalesMargin(groupBy) {
    let query = supabase.from('order_lines').select('*, customer_orders(order_date, customers(company)), suppliers(company), products(commodity)');
    const { data } = await query;
    let lines = data || [];
    lines = lines.filter(l => {
      const d = l.customer_orders?.order_date;
      if (dateFrom && (!d || d < dateFrom)) return false;
      if (dateTo && (!d || d > dateTo)) return false;
      return true;
    });

    const groups = {};
    lines.forEach(l => {
      let key;
      if (groupBy === 'by_customer') key = l.customer_orders?.customers?.company || '—';
      else if (groupBy === 'by_supplier') key = l.suppliers?.company || '—';
      else key = l.products?.commodity || '—';

      if (!groups[key]) groups[key] = { cases: 0, revenue: 0, cost: 0 };
      const revenue = Number(l.cases_ordered || 0) * Number(l.sell_price_per_case || 0);
      const cost = Number(l.cases_ordered || 0) * Number(l.fob_cost_per_case || 0);
      groups[key].cases += Number(l.cases_ordered || 0);
      groups[key].revenue += revenue;
      groups[key].cost += cost;
    });

    const label = groupBy === 'by_customer' ? 'Customer' : groupBy === 'by_supplier' ? 'Supplier' : 'Commodity';
    setColumns([label, 'Cases', 'Revenue', 'Cost', 'Margin', 'Margin %']);
    setRows(Object.entries(groups).map(([name, g]) => {
      const margin = g.revenue - g.cost;
      return [name, g.cases.toLocaleString(), fmt$(g.revenue), fmt$(g.cost), fmt$(margin), g.revenue ? ((margin / g.revenue) * 100).toFixed(1) + '%' : '—'];
    }).sort((a, b) => b[2].localeCompare(a[2])));
  }

  async function runFreightSummary() {
    const { data } = await supabase.from('freight_records').select('*, jackets(jacket_number, jacket_date)');
    let records = data || [];
    records = records.filter(r => {
      const d = r.jackets?.jacket_date;
      if (dateFrom && (!d || d < dateFrom)) return false;
      if (dateTo && (!d || d > dateTo)) return false;
      return true;
    });
    setColumns(['Jacket', 'Date', 'Carrier', 'Miles', 'Booked Rate', '$/Mile']);
    setRows(records.map(r => [
      r.jackets?.jacket_number || '—', r.jackets?.jacket_date || '—', r.carrier || '—',
      r.miles || '—', r.booked_rate ? fmt$(r.booked_rate) : '—',
      r.miles && r.booked_rate ? '$' + (r.booked_rate / r.miles).toFixed(2) : '—'
    ]));
  }

  function fmt$(n) { return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 }); }
  function parseDollar(str) {
    if (!str || str === '—') return 0;
    const negative = String(str).includes('-');
    const n = Number(String(str).replace(/[^0-9.]/g, ''));
    return Number.isNaN(n) ? 0 : (negative ? -n : n);
  }

  function exportCSV() {
    const csv = [columns.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `freshops-report-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Reports">
      <div className="fo-card" style={{ display: 'flex', gap: 14, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13 }}>
          <span className="fo-field-label">Report</span>
          <select value={reportType} onChange={e => setReportType(e.target.value)} style={input}>
            {REPORT_TYPES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          <span className="fo-field-label">From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={input} />
        </label>
        <label style={{ fontSize: 13 }}>
          <span className="fo-field-label">To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={input} />
        </label>
        <button onClick={runReport} style={btn}>Run Report</button>
        {rows.length > 0 && <button onClick={exportCSV} style={{ ...btn, background: 'var(--fo-accent)' }}>⬇ Export CSV</button>}
      </div>

      {loading ? <p style={{ color: 'var(--fo-text-faint)' }}>Running…</p> : rows.length === 0 ? (
        <p style={{ color: 'var(--fo-text-faint)' }}>No data for this report / date range yet.</p>
      ) : (
        <>
          <div className="fo-card" style={{ marginBottom: 16 }}>
            <h2 className="fo-h2">{reportType === 'freight_summary' ? 'Booked Rate by Jacket' : 'Margin by ' + columns[0]}</h2>
            <BarChart
              data={rows.slice(0, 10).map(r => ({ label: r[0], value: parseDollar(r[4]) }))}
              formatValue={v => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
          </div>
          <div className="fo-table-wrap">
          <table style={table} className="fo-table">
            <thead><tr style={trHead}>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i} style={tr}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
            ))}</tbody>
          </table>
          </div>
        </>
      )}

      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--fo-text-faint)' }}>
        Don't see a report you need? Tell me what you're trying to answer (e.g. "margin by month," "which suppliers I buy the most from") and I'll add it as its own report type.
      </div>
    </AppShell>
  );
}

const btn = { padding: '10px 18px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 'var(--fo-radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
const input = { display: 'block', padding: '8px 11px', marginTop: 4 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
