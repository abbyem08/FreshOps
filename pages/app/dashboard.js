// pages/app/dashboard.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';
import { BarChart, ProgressBar } from '../../components/charts';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [issues, setIssues] = useState([]);
  const [jacketProfitChart, setJacketProfitChart] = useState([]);
  const [statusChart, setStatusChart] = useState([]);
  const [casesNeededChart, setCasesNeededChart] = useState([]);
  const [supplyDemand, setSupplyDemand] = useState({ needed: 0, available: 0 });
  const [activePulse, setActivePulse] = useState([]);
  const [totalActiveProfit, setTotalActiveProfit] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    const [ol, jl, freight, jackets, claims, jpl, orders] = await Promise.all([
      supabase.from('order_lines').select('order_line_id, cases_ordered, sell_price_per_case, fob_cost_per_case, product_id, products(commodity, pack_size), customer_orders(order_status)'),
      supabase.from('jacket_lines').select('order_line_id, cases_to_load, allocated_cost_per_case, jacket_product_line_id, jacket_id, order_lines(sell_price_per_case, customer_order_id), jackets(jacket_status, jacket_number)'),
      supabase.from('freight_records').select('booked_rate, extra_fees, jacket_id, jackets(jacket_status)'),
      supabase.from('jackets').select('jacket_id, jacket_number, jacket_status, carrier'),
      supabase.from('claims').select('claim_id, status, jacket_id, snapshot_jacket_number, snapshot_customer').eq('status', 'Open'),
      supabase.from('jacket_product_lines').select('jacket_product_line_id, purchased_cases, actual_cases_received, jacket_id, product_id, products(cases_per_pallet, gross_weight_per_case), jackets(jacket_status)'),
      supabase.from('customer_orders').select('customer_order_id, order_status'),
    ]);

    const openLines = (ol.data || []).filter(l => l.customer_orders?.order_status === 'Open');
    const openRevenue = openLines.reduce((s, l) => s + Number(l.cases_ordered || 0) * Number(l.sell_price_per_case || 0), 0);
    const openCost = openLines.reduce((s, l) => s + Number(l.cases_ordered || 0) * Number(l.fob_cost_per_case || 0), 0);
    const grossMargin = openRevenue - openCost;
    const openOrdersCount = (orders.data || []).filter(o => o.order_status === 'Open').length;

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

    // ---- Cases Still Needed, by commodity ----
    const neededByCommodity = {};
    openLines.forEach(l => {
      const remaining = Number(l.cases_ordered || 0) - (assignedByLine[l.order_line_id] || 0);
      if (remaining <= 0) return;
      const label = l.products?.commodity || 'Unknown';
      neededByCommodity[label] = (neededByCommodity[label] || 0) + remaining;
    });
    setCasesNeededChart(
      Object.entries(neededByCommodity)
        .map(([label, value]) => ({ label, value, color: 'var(--fo-warn)' }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    );

    // ---- Orders vs Available Product — total open demand vs total
    // purchased-but-unallocated supply, across active Jackets ----
    const allocatedByPurchased = {};
    (jl.data || []).forEach(row => {
      if (row.jackets?.jacket_status === 'Cancelled' || !row.jacket_product_line_id) return;
      allocatedByPurchased[row.jacket_product_line_id] = (allocatedByPurchased[row.jacket_product_line_id] || 0) + Number(row.cases_to_load || 0);
    });
    const totalAvailable = (jpl.data || [])
      .filter(p => !['Closed', 'Cancelled'].includes(p.jackets?.jacket_status))
      .reduce((s, p) => {
        const purchased = Number(p.actual_cases_received ?? p.purchased_cases ?? 0);
        const allocated = allocatedByPurchased[p.jacket_product_line_id] || 0;
        return s + Math.max(0, purchased - allocated);
      }, 0);
    setSupplyDemand({ needed: casesNeeded, available: totalAvailable });

    setStats({ openRevenue, grossMargin, committedFreight, activeJackets: activeJackets.length, casesNeeded, openLineCount: openLines.length, openOrdersCount, openClaimsCount: (claims.data || []).length });

    // ---- Profit by Jacket (all active jackets — chart shows top 8, hero
    // KPI and Active Jacket Pulse use the full set) ----
    const profitByJacket = {};
    (jl.data || []).forEach(row => {
      if (row.jackets?.jacket_status === 'Cancelled' || !row.jacket_id) return;
      if (!profitByJacket[row.jacket_id]) profitByJacket[row.jacket_id] = { label: row.jackets?.jacket_number || `#${row.jacket_id}`, value: 0, revenue: 0, status: row.jackets?.jacket_status };
      const revenue = Number(row.cases_to_load || 0) * Number(row.order_lines?.sell_price_per_case || 0);
      const cost = Number(row.cases_to_load || 0) * Number(row.allocated_cost_per_case || 0);
      profitByJacket[row.jacket_id].value += revenue - cost;
      profitByJacket[row.jacket_id].revenue += revenue;
    });
    const activeProfitEntries = Object.entries(profitByJacket).filter(([, j]) => !['Closed', 'Cancelled'].includes(j.status));
    const totalActiveProfit = activeProfitEntries.reduce((s, [, j]) => s + j.value, 0);
    setJacketProfitChart(
      activeProfitEntries.map(([, j]) => j)
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
        .slice(0, 8)
    );

    // ---- Active Jacket Pulse — same pallet/weight formula as the
    // Jackets list, so the two pages can never disagree ----
    const carrierByJacket = {};
    (freight.data || []).forEach(f => { if (!carrierByJacket[f.jacket_id]) carrierByJacket[f.jacket_id] = true; });
    const claimsByJacket = {};
    (claims.data || []).forEach(c => { if (c.jacket_id) claimsByJacket[c.jacket_id] = (claimsByJacket[c.jacket_id] || 0) + 1; });
    const productsByJacket = {};
    const ordersByJacket = {};
    (jpl.data || []).forEach(p => { productsByJacket[p.jacket_id] = (productsByJacket[p.jacket_id] || new Set()); productsByJacket[p.jacket_id].add(p.jacket_product_line_id); });
    (jl.data || []).forEach(row => {
      if (!row.jacket_id || row.jackets?.jacket_status === 'Cancelled') return;
      if (!ordersByJacket[row.jacket_id]) ordersByJacket[row.jacket_id] = new Set();
      if (row.order_lines?.customer_order_id) ordersByJacket[row.jacket_id].add(row.order_lines.customer_order_id);
    });
    const pulse = activeJackets.map(j => {
      const purchased = (jpl.data || []).filter(p => p.jacket_id === j.jacket_id);
      const totalPallets = purchased.reduce((s, p) => s + (p.products?.cases_per_pallet ? Math.ceil((p.actual_cases_received ?? p.purchased_cases) / p.products.cases_per_pallet) : 0), 0);
      const totalWeight = purchased.reduce((s, p) => s + (p.products?.gross_weight_per_case || 0) * (p.actual_cases_received ?? (p.purchased_cases || 0)), 0);
      const profitEntry = profitByJacket[j.jacket_id];
      return {
        jacket_id: j.jacket_id, jacket_number: j.jacket_number, jacket_status: j.jacket_status, carrier: j.carrier,
        productCount: productsByJacket[j.jacket_id]?.size || 0,
        orderCount: ordersByJacket[j.jacket_id]?.size || 0,
        totalPallets, totalWeight,
        estProfit: profitEntry?.value || 0,
        estRevenue: profitEntry?.revenue || 0,
        claimsCount: claimsByJacket[j.jacket_id] || 0,
        hasFreight: !!carrierByJacket[j.jacket_id],
      };
    }).sort((a, b) => {
      const inTransitRank = s => s === 'In Transit' ? 0 : s === 'Loading' || s === 'Dispatched' ? 1 : s === 'Booked' ? 2 : 3;
      return inTransitRank(a.jacket_status) - inTransitRank(b.jacket_status) || b.estProfit - a.estProfit;
    });
    setActivePulse(pulse);
    setTotalActiveProfit(totalActiveProfit);

    // ---- Jacket Status Distribution ----
    const statusCounts = {};
    (jackets.data || []).forEach(j => { statusCounts[j.jacket_status] = (statusCounts[j.jacket_status] || 0) + 1; });
    const statusColors = { Planning: 'var(--fo-text-faint)', Booked: 'var(--fo-info)', Loading: 'var(--fo-warn)', Dispatched: 'var(--fo-warn)', 'In Transit': 'var(--fo-info)', Delivered: 'var(--fo-success)', Closed: 'var(--fo-text-dim)', Cancelled: 'var(--fo-error)' };
    setStatusChart(Object.entries(statusCounts).map(([label, value]) => ({ label, value, color: statusColors[label] })));

    // ---- Attention Center: real data only, sorted by real severity ----
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
    if (totalAvailable > 0) {
      issueList.push({ label: `${totalAvailable.toLocaleString()} cases available for sale`, tone: 'blue', detail: 'purchased and sitting on active Jackets, not yet allocated' });
    }
    const severityRank = { red: 0, amber: 1, blue: 2 };
    issueList.sort((a, b) => severityRank[a.tone] - severityRank[b.tone]);
    setIssues(issueList);
  }

  if (!stats) return <AppShell title="Dashboard"><p style={{ color: 'var(--fo-text-faint)' }}>Loading…</p></AppShell>;

  return (
    <AppShell title="Dashboard">
      <div className="fo-hero">
        <div className="fo-hero-label">FreshOps Command Center</div>
        <div className="fo-hero-grid">
          <HeroKPI label="Active Jackets" value={stats.activeJackets} />
          <HeroKPI label="Open Orders" value={stats.openOrdersCount} />
          <HeroKPI label="Cases Still Needed" value={stats.casesNeeded.toLocaleString()} tone={stats.casesNeeded > 0 ? 'amber' : undefined} />
          <HeroKPI label="Available Cases" value={supplyDemand.available.toLocaleString()} tone={supplyDemand.available > 0 ? 'blue' : undefined} />
          <HeroKPI label="Open Claims" value={stats.openClaimsCount} tone={stats.openClaimsCount > 0 ? 'red' : undefined} />
          <HeroKPI label="Est. Active Profit" value={`$${totalActiveProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} tone={totalActiveProfit >= 0 ? 'green' : 'red'} />
        </div>
      </div>

      {/* ---- Active Jacket Pulse ---- */}
      <div style={{ marginTop: 28 }}>
        <h2 className="fo-h2">Active Jacket Pulse</h2>
        {activePulse.length === 0 ? (
          <div className="fo-card"><span style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No active Jackets right now.</span></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {activePulse.map(j => {
              const isMoving = j.jacket_status === 'In Transit';
              const marginPct = j.estRevenue ? (j.estProfit / j.estRevenue) * 100 : null;
              return (
                <div key={j.jacket_id} className={'fo-card' + (isMoving ? ' fo-pulse-active' : '')} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{j.jacket_number}</div>
                      <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{j.carrier || 'No carrier'}</div>
                    </div>
                    <span className={`fo-badge ${isMoving ? 'fo-badge-blue' : j.jacket_status === 'Planning' ? 'fo-badge-gray' : 'fo-badge-amber'}`}>{j.jacket_status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, marginTop: 10, fontSize: 12.5, color: 'var(--fo-text-dim)' }}>
                    <span>{j.productCount} product{j.productCount === 1 ? '' : 's'}</span>
                    <span>{j.orderCount} order{j.orderCount === 1 ? '' : 's'}</span>
                    {j.claimsCount > 0 && <span style={{ color: 'var(--fo-error)', fontWeight: 600 }}>{j.claimsCount} claim{j.claimsCount === 1 ? '' : 's'}</span>}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <ProgressBar label="Pallets" current={j.totalPallets} max={24} height={5} />
                    <ProgressBar label="Weight" current={j.totalWeight} max={42500} unit=" lb" height={5} />
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: j.estProfit >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>${j.estProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    {marginPct != null && <span style={{ fontSize: 11.5, color: 'var(--fo-text-faint)' }}>{marginPct.toFixed(1)}% margin</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 28 }}>
        <div className="fo-card">
          <h2 className="fo-h2">Profit Radar</h2>
          <BarChart data={jacketProfitChart} formatValue={v => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} emptyText="No active Jackets with allocated product yet." />
        </div>
        <div className="fo-card">
          <h2 className="fo-h2">Jacket Status Distribution</h2>
          <BarChart data={statusChart} emptyText="No Jackets yet." />
        </div>
        <div className="fo-card">
          <h2 className="fo-h2">Supply Pressure</h2>
          <BarChart data={casesNeededChart} emptyText="Nothing outstanding — every open order is sourced." />
        </div>
        <div className="fo-card">
          <h2 className="fo-h2">Available Product</h2>
          {supplyDemand.needed === 0 && supplyDemand.available === 0 ? (
            <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No open demand or purchased product yet.</div>
          ) : (
            <>
              <BarChart
                data={[
                  { label: 'Still Needed', value: supplyDemand.needed, color: 'var(--fo-warn)' },
                  { label: 'Available', value: supplyDemand.available, color: 'var(--fo-success)' },
                ]}
              />
              <div style={{ fontSize: 12, color: 'var(--fo-text-faint)', marginTop: 10 }}>Available product isn't necessarily the same commodity as what's still needed — this is a fleet-wide total, not a 1:1 match.</div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <h2 className="fo-h2">Attention Center</h2>
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

function HeroKPI({ label, value, tone }) {
  const toneColor = { red: 'var(--fo-error)', amber: 'var(--fo-warn)', blue: 'var(--fo-info)', green: 'var(--fo-success)' };
  return (
    <div className="fo-hero-kpi">
      <div className="fo-kpi-label">{label}</div>
      <div className="fo-kpi-value" style={tone ? { color: toneColor[tone] } : undefined}>{value}</div>
    </div>
  );
}
