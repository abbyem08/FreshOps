// pages/app/ops.js
import { useEffect, useState, Fragment } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const STATUS_OPTIONS = ['Planned', 'Loading', 'Loaded', 'In Transit', 'Delivered', 'Short', 'Exception'];

export default function OpsPage() {
  const [lines, setLines] = useState([]);
  const [claims, setClaims] = useState([]);
  const [jackets, setJackets] = useState([]);
  const [jacketFilter, setJacketFilter] = useState('all');
  const [extras, setExtras] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ jacket_line_id: '', claim_type: 'Quality', description: '' });
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: 'Resolved', resolution: '', price_adjustment: '' });
  const [addToOrderId, setAddToOrderId] = useState(null);
  const [addToOrderForm, setAddToOrderForm] = useState({ order_id: '', supplier_id: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: j } = await supabase.from('jackets').select('jacket_id, jacket_number').order('jacket_number');
    setJackets(j || []);

    const { data: jl } = await supabase
      .from('jacket_lines')
      .select('*, jackets(jacket_id, jacket_number), order_lines(product_id, products(commodity, pack_size), suppliers(company), customer_orders(acumatica_order_no, customers(company)))')
      .order('jacket_id')
      .order('jacket_line_id');
    setLines(jl || []);

    const { data: c } = await supabase
      .from('claims')
      .select('*, jacket_lines(jacket_id, jackets(jacket_number), order_line_id, order_lines(order_line_id, sell_price_per_case, products(commodity, pack_size), customer_orders(acumatica_order_no, customers(company))))')
      .order('date_opened', { ascending: false });
    setClaims(c || []);

    const { data: ex } = await supabase
      .from('jacket_extras')
      .select('*, jackets(jacket_number), products(commodity, pack_size)')
      .neq('status', 'Sold')
      .order('jacket_id');
    setExtras(ex || []);

    const { data: o } = await supabase.from('customer_orders').select('customer_order_id, acumatica_order_no, customers(company)').eq('order_status', 'Open').order('acumatica_order_no');
    setOpenOrders(o || []);
    const { data: s } = await supabase.from('suppliers').select('supplier_id, company').order('company');
    setSuppliers(s || []);
  }

  // ---- discrepancy detection ----
  // Commodity-level: if a jacket's total loaded for a product doesn't match
  // total ordered, EVERY line of that product on that jacket is flagged —
  // because a shortage means cases get manually redistributed across
  // whichever customers ordered that same commodity, not just one order.
  // Delivery-level: flags a single line where what was loaded doesn't match
  // what was actually delivered (a real transit/receiving discrepancy).
  function computeFlags() {
    const groups = {};
    lines.forEach(l => {
      const pid = l.order_lines?.product_id;
      if (!pid) return;
      const key = l.jacket_id + '-' + pid;
      if (!groups[key]) groups[key] = { ordered: 0, loaded: 0, anyStillPlanned: false };
      groups[key].ordered += Number(l.cases_to_load || 0);
      groups[key].loaded += Number(l.actual_cases_loaded || 0);
      if (l.load_status === 'Planned') groups[key].anyStillPlanned = true;
    });
    const flags = {};
    lines.forEach(l => {
      const pid = l.order_lines?.product_id;
      const key = l.jacket_id + '-' + pid;
      const g = groups[key];
      // Only flag once loading is considered done for every order sharing this
      // commodity on this jacket — a partial load still in progress isn't a
      // discrepancy yet, it's just not finished.
      const commodityShortage = g && !g.anyStillPlanned && g.loaded !== g.ordered;
      const deliveryMismatch = Number(l.actual_cases_loaded || 0) > 0 && Number(l.actual_cases_delivered || 0) > 0 && Number(l.actual_cases_loaded) !== Number(l.actual_cases_delivered);
      flags[l.jacket_line_id] = { commodityShortage, deliveryMismatch };
    });
    return flags;
  }

  async function updateField(id, field, value) {
    const { error } = await supabase.from('jacket_lines').update({ [field]: value, updated_at: new Date().toISOString() }).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }

  async function toggleNotify(id, stage, currentlyOn) {
    const fields = stage === 'pickup'
      ? { customer_notified_pickup: !currentlyOn, customer_notified_pickup_at: !currentlyOn ? new Date().toISOString() : null }
      : { customer_notified_delivery: !currentlyOn, customer_notified_delivery_at: !currentlyOn ? new Date().toISOString() : null };
    const { error } = await supabase.from('jacket_lines').update(fields).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }

  async function saveClaim() {
    if (!claimForm.jacket_line_id || !claimForm.description) { alert('Pick a jacket line and describe the issue.'); return; }
    const { error } = await supabase.from('claims').insert({
      jacket_line_id: Number(claimForm.jacket_line_id),
      claim_type: claimForm.claim_type,
      description: claimForm.description,
      status: 'Open'
    });
    if (error) { alert('Save failed: ' + error.message); return; }
    setClaimForm({ jacket_line_id: '', claim_type: 'Quality', description: '' });
    setShowClaimForm(false);
    load();
  }

  function openResolve(claim) {
    setResolveForm({ status: claim.status === 'Open' ? 'Resolved' : claim.status, resolution: claim.resolution || '', price_adjustment: claim.resolution_price_adjustment || '' });
    setResolvingId(claim.claim_id);
  }

  async function saveResolve(claim) {
    const adjustment = resolveForm.price_adjustment ? Number(resolveForm.price_adjustment) : null;
    const { error } = await supabase.from('claims').update({
      status: resolveForm.status,
      resolution: resolveForm.resolution,
      resolution_price_adjustment: adjustment,
      resolved_at: resolveForm.status === 'Resolved' ? new Date().toISOString() : null,
      flag_for_credit_memo: !!adjustment
    }).eq('claim_id', claim.claim_id);
    if (error) { alert('Save failed: ' + error.message); return; }

    if (adjustment && claim.jacket_lines?.order_lines) {
      const ol = claim.jacket_lines.order_lines;
      const newPrice = Number(ol.sell_price_per_case) - adjustment;
      const { error: priceError } = await supabase.from('order_lines').update({ sell_price_per_case: newPrice }).eq('order_line_id', ol.order_line_id);
      if (priceError) { alert('Claim saved, but price update failed: ' + priceError.message); }
    }
    setResolvingId(null);
    load();
  }

  async function updateExtra(id, field, value) {
    const { error } = await supabase.from('jacket_extras').update({ [field]: value }).eq('extra_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }

  async function addToOrder(extra) {
    if (!addToOrderForm.order_id || !addToOrderForm.supplier_id) { alert('Pick both an order and a supplier.'); return; }
    const { error } = await supabase.from('order_lines').insert({
      customer_order_id: Number(addToOrderForm.order_id),
      supplier_id: Number(addToOrderForm.supplier_id),
      product_id: extra.product_id,
      cases_ordered: extra.cases,
      line_status: 'Open',
    });
    if (error) { alert('Failed to add to order: ' + error.message); return; }
    const orderLabel = openOrders.find(o => o.customer_order_id === Number(addToOrderForm.order_id))?.acumatica_order_no;
    await supabase.from('jacket_extras').update({ status: 'Sold', resolution_notes: `Added to order ${orderLabel}` }).eq('extra_id', extra.extra_id);
    setAddToOrderId(null);
    setAddToOrderForm({ order_id: '', supplier_id: '' });
    load();
  }

  const flags = computeFlags();
  const filteredLines = jacketFilter === 'all' ? lines : lines.filter(l => l.jacket_id === Number(jacketFilter));
  const filteredClaims = jacketFilter === 'all' ? claims : claims.filter(c => c.jacket_lines?.jacket_id === Number(jacketFilter));
  const filteredExtras = jacketFilter === 'all' ? extras : extras.filter(x => x.jacket_id === Number(jacketFilter));
  const shortLines = filteredLines.filter(l => Number(l.actual_cases_loaded || 0) > Number(l.actual_cases_delivered || 0));

  return (
    <AppShell title="Load Tracking">
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 12 }}>Track load progress, document BOLs, log customer notifications, and catch discrepancies before they become problems.</div>
      <label style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>Viewing
        <select value={jacketFilter} onChange={e => setJacketFilter(e.target.value)} style={{ display: 'block', padding: '6px 8px', marginTop: 4, width: 220 }}>
          <option value="all">All Jackets</option>
          {jackets.map(j => <option key={j.jacket_id} value={j.jacket_id}>{j.jacket_number}</option>)}
        </select>
      </label>

      {filteredLines.length === 0 ? (
        <p style={{ color: '#a8a29e' }}>No jacket lines yet — assign order lines to a Jacket first.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#FCE9C9', display: 'inline-block', borderRadius: 2 }}></span> Commodity loaded ≠ ordered (loading complete, still mismatched)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: '#F8D7D2', display: 'inline-block', borderRadius: 2 }}></span> Delivered ≠ loaded</span>
          </div>
          <table style={table}>
            <thead><tr style={trHead}><th>Jacket</th><th>Order #</th><th>Customer</th><th>Shipper</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Ordered</th><th>Actual Loaded</th><th>Actual Delivered</th><th>BOL #</th><th>Status</th><th>Told: Picked Up</th><th>Told: Delivered</th><th>Exception / Notes</th></tr></thead>
            <tbody>{filteredLines.map(jl => {
              const f = flags[jl.jacket_line_id] || {};
              const rowStyle = f.deliveryMismatch ? { ...tr, background: '#F8D7D2' } : f.commodityShortage ? { ...tr, background: '#FCE9C9' } : tr;
              return (
                <tr key={jl.jacket_line_id} style={rowStyle}>
                  <td style={{ fontFamily: 'monospace' }}>{jl.jackets?.jacket_number}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{jl.order_lines?.customer_orders?.acumatica_order_no}</td>
                  <td>{jl.order_lines?.customer_orders?.customers?.company}</td>
                  <td>{jl.order_lines?.suppliers?.company}</td>
                  <td>{jl.order_lines?.products?.commodity} — {jl.order_lines?.products?.pack_size}</td>
                  <td style={{ textAlign: 'right' }}>{jl.cases_to_load}</td>
                  <td><input type="number" defaultValue={jl.actual_cases_loaded} onBlur={e => updateField(jl.jacket_line_id, 'actual_cases_loaded', Number(e.target.value))} style={{ width: 64 }} /></td>
                  <td><input type="number" defaultValue={jl.actual_cases_delivered} onBlur={e => updateField(jl.jacket_line_id, 'actual_cases_delivered', Number(e.target.value))} style={{ width: 64 }} /></td>
                  <td><input type="text" defaultValue={jl.bol_number || ''} onBlur={e => updateField(jl.jacket_line_id, 'bol_number', e.target.value)} style={{ width: 90 }} placeholder="BOL #" /></td>
                  <td>
                    <select defaultValue={jl.load_status} onChange={e => updateField(jl.jacket_line_id, 'load_status', e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button onClick={() => toggleNotify(jl.jacket_line_id, 'pickup', jl.customer_notified_pickup)} style={notifyBtn(jl.customer_notified_pickup)}>
                      {jl.customer_notified_pickup ? `✓ ${new Date(jl.customer_notified_pickup_at).toLocaleDateString()}` : 'Mark notified'}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => toggleNotify(jl.jacket_line_id, 'delivery', jl.customer_notified_delivery)} style={notifyBtn(jl.customer_notified_delivery)}>
                      {jl.customer_notified_delivery ? `✓ ${new Date(jl.customer_notified_delivery_at).toLocaleDateString()}` : 'Mark notified'}
                    </button>
                  </td>
                  <td><input type="text" defaultValue={jl.exception_notes || ''} onBlur={e => updateField(jl.jacket_line_id, 'exception_notes', e.target.value)} style={{ width: 160 }} placeholder="Notes" /></td>
                </tr>
              );
            })}</tbody>
          </table>
        </>
      )}

      {/* ---- Claims ---- */}
      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#C0562D' }}>⚠ Claims &amp; Quality Issues</div>
            <div style={{ fontSize: 12, color: '#a8a29e' }}>Operational record only — flag it, then AP/AR issues the actual credit memo in Acumatica.</div>
          </div>
          <button onClick={() => setShowClaimForm(!showClaimForm)} style={{ padding: '6px 14px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ Log Claim</button>
        </div>
        {showClaimForm && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <label style={{ fontSize: 13 }}>Jacket Line
              <select value={claimForm.jacket_line_id} onChange={e => setClaimForm({ ...claimForm, jacket_line_id: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                <option value="">— select —</option>
                {lines.map(jl => <option key={jl.jacket_line_id} value={jl.jacket_line_id}>{jl.jackets?.jacket_number} — {jl.order_lines?.products?.commodity}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>Type
              <select value={claimForm.claim_type} onChange={e => setClaimForm({ ...claimForm, claim_type: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                <option>Quality</option><option>Shortage</option><option>Temperature</option><option>Damage</option><option>Delay</option>
              </select>
            </label>
            <label style={{ fontSize: 13, gridColumn: 'span 3' }}>Description
              <input value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }} />
            </label>
            <button onClick={saveClaim} style={{ padding: '8px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', gridColumn: 'span 1' }}>Save Claim</button>
          </div>
        )}
        {filteredClaims.length > 0 && (
          <table style={{ ...table, marginTop: 16 }}>
            <thead><tr style={trHead}><th>Jacket</th><th>Order #</th><th>Customer</th><th>Type</th><th>Description</th><th>Commodity</th><th>Opened</th><th>Status</th><th>Price Adj.</th><th></th></tr></thead>
            <tbody>{filteredClaims.map(c => (
              <Fragment key={c.claim_id}>
                <tr style={tr}>
                  <td style={{ fontFamily: 'monospace' }}>{c.jacket_lines?.jackets?.jacket_number}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.jacket_lines?.order_lines?.customer_orders?.acumatica_order_no}</td>
                  <td>{c.jacket_lines?.order_lines?.customer_orders?.customers?.company}</td>
                  <td>{c.claim_type}</td><td>{c.description}</td>
                  <td>{c.jacket_lines?.order_lines?.products?.commodity}</td>
                  <td style={{ color: '#a8a29e', fontSize: 12 }}>{c.date_opened}</td>
                  <td><span style={statusPill(c.status)}>{c.status}</span></td>
                  <td>{c.resolution_price_adjustment ? `-$${Number(c.resolution_price_adjustment).toFixed(2)}/cs` : '—'}</td>
                  <td><button onClick={() => openResolve(c)} style={editBtn}>{c.status === 'Open' ? 'Resolve' : 'Edit'}</button></td>
                </tr>
                {resolvingId === c.claim_id && (
                  <tr>
                    <td colSpan={10} style={{ background: '#F6F4EC', padding: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <label style={{ fontSize: 13 }}>Status
                          <select value={resolveForm.status} onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                            <option>Open</option><option>Under Review</option><option>Resolved</option>
                          </select>
                        </label>
                        <label style={{ fontSize: 13 }}>Price Adjustment ($/case decrease)
                          <input type="number" value={resolveForm.price_adjustment} onChange={e => setResolveForm({ ...resolveForm, price_adjustment: e.target.value })} placeholder="e.g. 2.00" style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }} />
                        </label>
                        <label style={{ fontSize: 13, gridColumn: 'span 2' }}>Resolution Notes
                          <input value={resolveForm.resolution} onChange={e => setResolveForm({ ...resolveForm, resolution: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }} />
                        </label>
                      </div>
                      <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 6 }}>A price adjustment reduces this order line's sell price for accurate margin — it never affects Market Call price history or trends.</div>
                      <button onClick={() => saveResolve(c)} style={{ marginTop: 8, marginRight: 8, padding: '6px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setResolvingId(null)} style={{ marginTop: 8, padding: '6px 16px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* ---- Jacket Reconciliation (folded in) ---- */}
      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, color: '#2F5233' }}>Jacket Reconciliation</div>
        <div style={{ fontSize: 12, color: '#a8a29e', marginBottom: 12 }}>Product physically on a truck that isn't fully accounted for — loaded but not delivered, or rolled/extra product still needing a home.</div>

        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Remaining on Truck</div>
        {shortLines.length === 0 ? <p style={{ color: '#a8a29e', fontSize: 13 }}>Nothing outstanding.</p> : (
          <table style={{ ...table, marginBottom: 20 }}>
            <thead><tr style={trHead}><th>Jacket</th><th>Order #</th><th>Customer</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Loaded</th><th style={{ textAlign: 'right' }}>Delivered</th><th style={{ textAlign: 'right' }}>Remaining</th></tr></thead>
            <tbody>{shortLines.map(l => (
              <tr key={l.jacket_line_id} style={tr}>
                <td style={{ fontFamily: 'monospace' }}>{l.jackets?.jacket_number}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.order_lines?.customer_orders?.acumatica_order_no}</td>
                <td>{l.order_lines?.customer_orders?.customers?.company}</td>
                <td>{l.order_lines?.products?.commodity} — {l.order_lines?.products?.pack_size}</td>
                <td style={{ textAlign: 'right' }}>{l.actual_cases_loaded}</td>
                <td style={{ textAlign: 'right' }}>{l.actual_cases_delivered}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{l.actual_cases_loaded - l.actual_cases_delivered}</td>
              </tr>
            ))}</tbody>
          </table>
        )}

        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Rolled / Extra Product to Sell or Resolve</div>
        {filteredExtras.length === 0 ? <p style={{ color: '#a8a29e', fontSize: 13 }}>Nothing unresolved right now.</p> : (
          <table style={table}>
            <thead><tr style={trHead}><th>Jacket</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th>Status</th><th>Notes</th><th></th></tr></thead>
            <tbody>{filteredExtras.map(x => (
              <Fragment key={x.extra_id}>
                <tr style={tr}>
                  <td style={{ fontFamily: 'monospace' }}>{x.jackets?.jacket_number}</td>
                  <td>{x.products?.commodity} — {x.products?.pack_size}</td>
                  <td style={{ textAlign: 'right' }}>{x.cases}</td>
                  <td>
                    <select defaultValue={x.status} onChange={e => updateExtra(x.extra_id, 'status', e.target.value)}>
                      <option>Unsold</option><option>Trying to Sell</option><option>Sold</option>
                    </select>
                  </td>
                  <td><input type="text" defaultValue={x.resolution_notes || ''} onBlur={e => updateExtra(x.extra_id, 'resolution_notes', e.target.value)} style={{ width: 180 }} placeholder="How was this resolved?" /></td>
                  <td><button onClick={() => setAddToOrderId(addToOrderId === x.extra_id ? null : x.extra_id)} style={editBtn}>Add to Order</button></td>
                </tr>
                {addToOrderId === x.extra_id && (
                  <tr>
                    <td colSpan={6} style={{ background: '#F6F4EC', padding: 12 }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                        <label style={{ fontSize: 13 }}>Add to which order?
                          <select value={addToOrderForm.order_id} onChange={e => setAddToOrderForm({ ...addToOrderForm, order_id: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, minWidth: 220 }}>
                            <option value="">— select —</option>
                            {openOrders.map(o => <option key={o.customer_order_id} value={o.customer_order_id}>{o.acumatica_order_no} — {o.customers?.company}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: 13 }}>Supplier (for the new line)
                          <select value={addToOrderForm.supplier_id} onChange={e => setAddToOrderForm({ ...addToOrderForm, supplier_id: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, minWidth: 180 }}>
                            <option value="">— select —</option>
                            {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
                          </select>
                        </label>
                        <button onClick={() => addToOrder(x)} style={{ padding: '8px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Confirm</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}</tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

function notifyBtn(on) {
  return { padding: '4px 10px', fontSize: 12, borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
    background: on ? '#6B8E4E' : '#fff', color: on ? '#fff' : '#333', border: on ? '1px solid #6B8E4E' : '1px solid #DCD5C1' };
}
function statusPill(status) {
  const colors = { Open: '#D9A441', 'Under Review': '#D9A441', Resolved: '#3E7C5A' };
  return { display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#fff', background: colors[status] || '#9CA3AF' };
}
const editBtn = { padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' };
const table = { width: '100%', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
