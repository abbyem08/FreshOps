// pages/app/dashboard.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [ol, jl, freight, jackets] = await Promise.all([
      supabase.from('order_lines').select('order_line_id, cases_ordered, sell_price_per_case, fob_cost_per_case, customer_orders(order_status)'),
      supabase.from('jacket_lines').select('order_line_id, cases_to_load, jackets(jacket_status)'),
      supabase.from('freight_records').select('booked_rate, extra_fees, jackets(jacket_status)'),
      supabase.from('jackets').select('jacket_id, jacket_status'),
    ]);

    const openLines = (ol.data || []).filter(l => l.customer_orders?.order_status === 'Open');
    const openRevenue = openLines.reduce((s, l) => s + Number(l.cases_ordered || 0) * Number(l.sell_price_per_case || 0), 0);
    const openCost = openLines.reduce((s, l) => s + Number(l.cases_ordered || 0) * Number(l.fob_cost_per_case || 0), 0);
    const grossMargin = openRevenue - openCost;

    const activeJackets = (jackets.data || []).filter(j => !['Closed', 'Cancelled'].includes(j.jacket_status)).length;

    const committedFreight = (freight.data || [])
      .filter(f => !['Closed', 'Cancelled'].includes(f.jackets?.jacket_status))
      .reduce((s, f) => s + Number(f.booked_rate || 0) + Number(f.extra_fees || 0), 0);

    const assignedByLine = {};
    (jl.data || []).forEach(row => {
      if (row.jackets?.jacket_status === 'Cancelled') return;
      assignedByLine[row.order_line_id] = (assignedByLine[row.order_line_id] || 0) + Number(row.cases_to_load || 0);
    });
    let casesNeeded = 0;
    openLines.forEach(l => {
      const remaining = Number(l.cases_ordered || 0) - (assignedByLine[l.order_line_id] || 0);
      if (remaining > 0) casesNeeded += remaining;
    });

    setStats({ openRevenue, grossMargin, committedFreight, activeJackets, casesNeeded, openLineCount: openLines.length });
  }

  if (!stats) return <AppShell title="Dashboard"><p style={{ color: '#a8a29e' }}>Loading…</p></AppShell>;

  return (
    <AppShell title="Dashboard">
      <div style={grid}>
        <KPI label="Open Revenue" value={`$${stats.openRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <KPI label="Gross Margin" value={`$${stats.grossMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <KPI label="Committed Freight Cost" value={`$${stats.committedFreight.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </div>
      <div style={{ ...grid, marginTop: 12 }}>
        <KPI label="Active Jackets" value={stats.activeJackets} />
        <KPI label="Open Order Lines" value={stats.openLineCount} />
        <KPI label="Cases Still Needed" value={stats.casesNeeded.toLocaleString()} />
      </div>
      <div style={{ marginTop: 20, fontSize: 12, color: '#a8a29e' }}>
        These numbers update automatically from Customer Orders, Jackets, and Freight — nothing here needs to be run or refreshed manually.
      </div>
    </AppShell>
  );
}

function KPI({ label, value }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.03em', color: '#78716c', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: '#2F5233', marginTop: 4 }}>{value}</div>
    </div>
  );
}

const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 };
