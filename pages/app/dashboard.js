// pages/app/dashboard.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const [ol, jl, freight, jackets, claims] = await Promise.all([
      supabase.from('order_lines').select('order_line_id, cases_ordered, sell_price_per_case, fob_cost_per_case, customer_orders(order_status)'),
      supabase.from('jacket_lines').select('order_line_id, cases_to_load, jackets(jacket_status)'),
      supabase.from('freight_records').select('booked_rate, extra_fees, jacket_id, jackets(jacket_status)'),
      supabase.from('jackets').select('jacket_id, jacket_number, jacket_status'),
      supabase.from('claims').select('claim_id, status, snapshot_jacket_number, snapshot_customer').eq('status', 'Open'),
    ]);

    const openLines = (ol.data || []).filter(l => l.customer_orders?.order_status === 'Open');
    const openRevenue = openLines.reduce((s, l) => s + Number(l.cases_ordered || 0) * Number(l.sell_price_per_case || 0), 0);
    const openCost = openLines.reduce((s, l) => s + Number(l.cases_ordered || 0) * Number(l.fob_cost_per_case || 0), 0);
    const grossMargin = openRevenue - openCost;

    const activeJackets = (jackets.data || []).filter(j => !['Closed', 'Cancelled'].includes(j.jacket_status));
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

    setStats({ openRevenue, grossMargin, committedFreight, activeJackets: activeJackets.length, casesNeeded, openLineCount: openLines.length });

    // ---- Open Issues: computed from real data, nothing fabricated ----
    const issueList = [];
    const openClaims = claims.data || [];
    if (openClaims.length > 0) {
      issueList.push({ label: `${openClaims.length} open claim${openClaims.length === 1 ? '' : 's'}`, tone: 'red', detail: openClaims.slice(0, 3).map(c => `${c.snapshot_jacket_number || '—'} · ${c.snapshot_customer || '—'}`).join(', ') });
    }
    if (casesNeeded > 0) {
      issueList.push({ label: `${casesNeeded.toLocaleString()} cases still needed`, tone: 'amber', detail: 'across open orders not yet sourced' });
    }
    const freightJacketIds = new Set((freight.data || []).map(f => f.jacket_id));
    const missingFreight = activeJackets.filter(j => !['Planning'].includes(j.jacket_status) && !freightJacketIds.has(j.jacket_id));
    if (missingFreight.length > 0) {
      issueList.push({ label: `${missingFreight.length} active Jacket${missingFreight.length === 1 ? '' : 's'} with no freight booked`, tone: 'amber', detail: missingFreight.slice(0, 4).map(j => j.jacket_number).join(', ') });
    }
    setIssues(issueList);
  }

  if (!stats) return <AppShell title="Dashboard"><p style={{ color: 'var(--fo-text-faint)' }}>Loading…</p></AppShell>;

  return (
    <AppShell title="Dashboard">
      <div style={grid3}>
        <KPI label="Open Revenue" value={`$${stats.openRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <KPI label="Gross Margin" value={`$${stats.grossMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <KPI label="Committed Freight Cost" value={`$${stats.committedFreight.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
      </div>
      <div style={{ ...grid3, marginTop: 16 }}>
        <KPI label="Active Jackets" value={stats.activeJackets} />
        <KPI label="Open Order Lines" value={stats.openLineCount} />
        <KPI label="Cases Still Needed" value={stats.casesNeeded.toLocaleString()} />
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 className="fo-h2">What needs attention</h2>
        {issues.length === 0 ? (
          <div className="fo-card">
            <span className="fo-badge fo-badge-green">All clear</span>
            <div style={{ marginTop: 10, color: 'var(--fo-text-dim)', fontSize: 13.5 }}>No open claims, everything's sourced, and every active Jacket has freight booked.</div>
          </div>
        ) : (
          <div className="fo-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {issues.map((issue, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span className={`fo-badge fo-badge-${issue.tone}`}>{issue.label}</span>
                <span style={{ color: 'var(--fo-text-faint)', fontSize: 12.5, marginTop: 3 }}>{issue.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: 'var(--fo-text-faint)' }}>
        These numbers update automatically from Customer Orders, Jackets, Freight, and Claims — nothing here needs to be run or refreshed manually.
      </div>
    </AppShell>
  );
}

function KPI({ label, value }) {
  return (
    <div className="fo-kpi">
      <div className="fo-kpi-label">{label}</div>
      <div className="fo-kpi-value">{value}</div>
    </div>
  );
}

const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 };
