// pages/app/jackets.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';
import { ProgressBar } from '../../components/charts';

export default function JacketsListPage() {
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Active');
  const [searchText, setSearchText] = useState('');
  const [needs, setNeeds] = useState([]);
  const [showNeeds, setShowNeeds] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const [j, jpl, jl, fr, cl, ol] = await Promise.all([
      supabase.from('jackets').select('*').order('jacket_id', { ascending: false }),
      supabase.from('jacket_product_lines').select('*, suppliers(company), products(commodity, cases_per_pallet, gross_weight_per_case)'),
      supabase.from('jacket_lines').select('*, order_lines(sell_price_per_case, customer_orders(acumatica_order_no)), jackets(jacket_status)'),
      supabase.from('freight_records').select('jacket_id, status'),
      supabase.from('claims').select('claim_id, jacket_lines(jacket_id)').eq('status', 'Open'),
      supabase.from('order_lines').select('order_line_id, cases_ordered, product_id, products(commodity, pack_size), customer_orders(order_status)').eq('customer_orders.order_status', 'Open'),
    ]);

    const purchasedByJacket = {};
    (jpl.data || []).forEach(p => { purchasedByJacket[p.jacket_id] = purchasedByJacket[p.jacket_id] || []; purchasedByJacket[p.jacket_id].push(p); });
    const linesByJacket = {};
    (jl.data || []).forEach(l => { linesByJacket[l.jacket_id] = linesByJacket[l.jacket_id] || []; linesByJacket[l.jacket_id].push(l); });
    const freightByJacket = {};
    (fr.data || []).forEach(f => { freightByJacket[f.jacket_id] = f; });
    const claimsByJacket = {};
    (cl.data || []).forEach(c => { const jid = c.jacket_lines?.jacket_id; if (jid) claimsByJacket[jid] = (claimsByJacket[jid] || 0) + 1; });

    const computed = (j.data || []).map(jacket => {
      const purchased = purchasedByJacket[jacket.jacket_id] || [];
      const lines = linesByJacket[jacket.jacket_id] || [];
      const allocatedByPurchased = {};
      (jl.data || []).forEach(l => { if (l.jacket_product_line_id) allocatedByPurchased[l.jacket_product_line_id] = (allocatedByPurchased[l.jacket_product_line_id] || 0) + Number(l.cases_to_load || 0); });
      const purchasedTotal = purchased.reduce((s, p) => s + Number(p.actual_cases_received ?? p.purchased_cases ?? 0), 0);
      const allocatedTotal = purchased.reduce((s, p) => s + (allocatedByPurchased[p.jacket_product_line_id] || 0), 0);
      const available = purchasedTotal - allocatedTotal;
      const orderCount = new Set(lines.map(l => l.order_lines?.customer_orders?.acumatica_order_no).filter(Boolean)).size;
      const estRevenue = lines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.order_lines?.sell_price_per_case || 0), 0);
      const estCost = lines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.allocated_cost_per_case || 0), 0);
      const estProfit = estRevenue - estCost;
      const openClaims = claimsByJacket[jacket.jacket_id] || 0;
      const freightRecord = freightByJacket[jacket.jacket_id];
      const attention = openClaims > 0 || (available > 0 && ['Loading', 'Dispatched', 'In Transit'].includes(jacket.jacket_status)) || (!freightRecord && !['Planning', 'Closed', 'Cancelled'].includes(jacket.jacket_status));
      const totalPallets = purchased.reduce((s, p) => s + (p.products?.cases_per_pallet ? Math.ceil((p.actual_cases_received ?? p.purchased_cases) / p.products.cases_per_pallet) : 0), 0);
      const totalWeight = purchased.reduce((s, p) => s + (p.products?.gross_weight_per_case || 0) * (p.actual_cases_received ?? (p.purchased_cases || 0)), 0);
      const weightCapacity = jacket.weight_capacity || 42500;
      const palletCapacity = jacket.pallet_capacity || 24;
      return { ...jacket, productCount: purchased.length, orderCount, available, estRevenue, estProfit, openClaims, freightStatus: freightRecord?.status, attention, totalPallets, totalWeight, weightCapacity, palletCapacity };
    });
    setRows(computed);

    // Cases Still Needed — same "ordered minus assigned to a non-cancelled
    // jacket" logic as the Ordering Needs page, grouped by commodity so
    // it's a quick glance for sourcing/truck planning
    const assignedByOrderLine = {};
    (jl.data || []).forEach(l => {
      if (l.jackets?.jacket_status === 'Cancelled' || !l.order_line_id) return;
      assignedByOrderLine[l.order_line_id] = (assignedByOrderLine[l.order_line_id] || 0) + Number(l.cases_to_load || 0);
    });
    const needGroups = {};
    (ol.data || []).forEach(l => {
      if (!l.customer_orders || l.customer_orders.order_status !== 'Open') return;
      const key = l.product_id;
      if (!needGroups[key]) needGroups[key] = { commodity: l.products?.commodity, packSize: l.products?.pack_size, needed: 0 };
      const assigned = assignedByOrderLine[l.order_line_id] || 0;
      const remaining = Number(l.cases_ordered || 0) - assigned;
      if (remaining > 0) needGroups[key].needed += remaining;
    });
    setNeeds(Object.values(needGroups).filter(g => g.needed > 0).sort((a, b) => b.needed - a.needed));
  }

  async function createNewJacket() {
    const jacket_number = prompt('Enter the Jacket number (from your shared drive list):');
    if (!jacket_number) return;
    const { data, error } = await supabase.from('jackets').insert({ jacket_number, jacket_status: 'Planning', jacket_date: new Date().toISOString().slice(0, 10) }).select().single();
    if (error) { alert('Could not create jacket: ' + error.message); return; }
    window.location.href = `/app/jacket/${data.jacket_id}`;
  }

  const summary = {
    active: rows.filter(r => !['Closed', 'Cancelled'].includes(r.jacket_status)).length,
    loading: rows.filter(r => ['Loading', 'Booked'].includes(r.jacket_status)).length,
    inTransit: rows.filter(r => r.jacket_status === 'In Transit').length,
    delivered: rows.filter(r => r.jacket_status === 'Delivered').length,
    needsAttention: rows.filter(r => r.attention).length,
    estProfit: rows.filter(r => !['Closed', 'Cancelled'].includes(r.jacket_status)).reduce((s, r) => s + r.estProfit, 0),
    casesAvailable: rows.filter(r => !['Closed', 'Cancelled'].includes(r.jacket_status)).reduce((s, r) => s + Math.max(0, r.available), 0),
  };

  const filtered = rows
    .filter(r => {
      if (statusFilter === 'Active') return !['Closed', 'Cancelled'].includes(r.jacket_status);
      if (statusFilter === 'All') return true;
      return r.jacket_status === statusFilter;
    })
    .filter(r => {
      if (!searchText) return true;
      const q = searchText.toLowerCase();
      return r.jacket_number?.toLowerCase().includes(q) || r.carrier?.toLowerCase().includes(q);
    });

  return (
    <AppShell title="InLoads / Jackets">
      {needs.length > 0 && (
        <div className="fo-card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="fo-h2" style={{ marginBottom: 0 }}>Cases Still Needed — across all open orders</div>
            <div>
              <a href="/app/ordering-needs" style={{ fontSize: 12.5, color: 'var(--fo-info)', marginRight: 12, textDecoration: 'none' }}>See which orders →</a>
              <button onClick={() => setShowNeeds(!showNeeds)} className="fo-btn fo-btn-secondary fo-btn-sm">{showNeeds ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          {showNeeds && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
              {needs.map((n, i) => (
                <div key={i} className="fo-badge fo-badge-amber" style={{ fontSize: 13, padding: '6px 14px' }}>
                  <strong>{n.needed.toLocaleString()}</strong>&nbsp;{n.commodity} — {n.packSize}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KPI label="Active Jackets" value={summary.active} />
        <KPI label="Loading / Preparing" value={summary.loading} />
        <KPI label="In Transit" value={summary.inTransit} />
        <KPI label="Delivered" value={summary.delivered} />
        <KPI label="Needs Attention" value={summary.needsAttention} tone={summary.needsAttention > 0 ? 'amber' : 'green'} />
        <KPI label="Est. Profit (Active)" value={`$${summary.estProfit.toLocaleString()}`} tone={summary.estProfit >= 0 ? 'green' : 'red'} />
        <KPI label="Cases Available" value={summary.casesAvailable.toLocaleString()} tone={summary.casesAvailable > 0 ? 'amber' : 'green'} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        {['Active', 'Planning', 'Loading', 'In Transit', 'Delivered', 'Closed', 'All'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className="fo-btn fo-btn-sm"
            style={{ background: statusFilter === s ? 'var(--fo-primary)' : 'var(--fo-card-bg)', color: statusFilter === s ? '#fff' : 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>
            {s}
          </button>
        ))}
        <input placeholder="Search jacket # or carrier…" value={searchText} onChange={e => setSearchText(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button onClick={createNewJacket} className="fo-btn fo-btn-primary">+ New Jacket</button>
      </div>

      <div className="fo-section" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ color: 'var(--fo-text-faint)', padding: 20 }}>No jackets match this filter.</div>
        ) : filtered.map(r => (
          <a key={r.jacket_id} href={`/app/jacket/${r.jacket_id}`} className="fo-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <strong style={{ fontFamily: 'monospace', fontSize: 15 }}>{r.jacket_number}</strong>
                <span className={statusBadgeClass(r.jacket_status)}>{r.jacket_status}</span>
                {r.attention && <span className="fo-badge fo-badge-amber">Needs Attention</span>}
                {r.openClaims > 0 && <span className="fo-badge fo-badge-red">{r.openClaims} Claim{r.openClaims === 1 ? '' : 's'}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '4px 20px', fontSize: 12.5, color: 'var(--fo-text-dim)', flex: '1 1 320px' }}>
                <span>{r.carrier || 'No carrier'}</span>
                <span>{r.jacket_date || '—'}</span>
                <span>{r.productCount} product{r.productCount === 1 ? '' : 's'}</span>
                <span>{r.orderCount} order{r.orderCount === 1 ? '' : 's'}</span>
                <span style={{ color: r.available > 0 ? 'var(--fo-warn)' : 'var(--fo-text-dim)' }}>{r.available} cs available</span>
                <span>${r.estRevenue.toLocaleString()} rev</span>
                <span style={{ color: r.estProfit >= 0 ? 'var(--fo-success)' : 'var(--fo-error)', fontWeight: 600 }}>${r.estProfit.toLocaleString()} profit</span>
              </div>
              {r.productCount > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '4px 20px', marginTop: 10 }}>
                  <ProgressBar label="Pallets" current={r.totalPallets} max={r.palletCapacity} height={6} />
                  <ProgressBar label="Weight" current={r.totalWeight} max={r.weightCapacity} unit=" lb" height={6} />
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </AppShell>
  );
}

function KPI({ label, value, tone }) {
  return (
    <div className="fo-kpi">
      <div className="fo-kpi-label">{label}</div>
      <div className="fo-kpi-value" style={{ color: tone === 'amber' ? 'var(--fo-warn)' : tone === 'red' ? 'var(--fo-error)' : tone === 'green' ? 'var(--fo-success)' : 'var(--fo-primary)' }}>{value}</div>
    </div>
  );
}
function statusBadgeClass(status) {
  if (['Delivered', 'Closed'].includes(status)) return 'fo-badge fo-badge-green';
  if (['In Transit', 'Dispatched'].includes(status)) return 'fo-badge fo-badge-blue';
  if (status === 'Cancelled') return 'fo-badge fo-badge-red';
  return 'fo-badge fo-badge-amber';
}
