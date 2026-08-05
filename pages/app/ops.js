// pages/app/ops.js
import { useEffect, useState, Fragment } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const STATUS_OPTIONS = ['Planned', 'Loading', 'Loaded', 'In Transit', 'Delivered', 'Short', 'Exception'];
const NOTIFICATION_TYPES = ['Loaded', 'In Transit', 'Delivered', 'Delayed / Issue'];

export default function OpsPage() {
  const [lines, setLines] = useState([]);
  const [commodityLoads, setCommodityLoads] = useState([]);
  const [claims, setClaims] = useState([]);
  const [jackets, setJackets] = useState([]);
  const [jacketFilter, setJacketFilter] = useState('all');
  const [extras, setExtras] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ jacket_line_id: '', claim_type: 'Quality', description: '' });
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: 'Resolved', resolution: '', price_adjustment: '', jacket_line_id: '' });
  const [addToOrderId, setAddToOrderId] = useState(null);
  const [addToOrderForm, setAddToOrderForm] = useState({ order_id: '', supplier_id: '' });
  const [amendingLineId, setAmendingLineId] = useState(null);
  const [amendValue, setAmendValue] = useState('');
  const [reassigningId, setReassigningId] = useState(null);
  const [reassignOptions, setReassignOptions] = useState([]);
  const [reassignTarget, setReassignTarget] = useState('');
  const [movingClaimId, setMovingClaimId] = useState(null);
  const [moveCasesForm, setMoveCasesForm] = useState({ target_order_line_id: '', cases: '' });
  const [moveCasesOptions, setMoveCasesOptions] = useState([]);
  const [compensatingClaimId, setCompensatingClaimId] = useState(null);
  const [compensationForm, setCompensationForm] = useState({ cases: '', notes: '' });
  const [notificationsByLine, setNotificationsByLine] = useState({});

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: j } = await supabase.from('jackets').select('jacket_id, jacket_number').order('jacket_number');
    setJackets(j || []);

    const { data: jl } = await supabase
      .from('jacket_lines')
      .select('*, jackets(jacket_id, jacket_number), order_lines(product_id, supplier_id, cases_ordered, original_cases_ordered, products(commodity, pack_size), suppliers(company), customer_orders(acumatica_order_no, customers(company)))')
      .order('jacket_id')
      .order('jacket_line_id');
    setLines(jl || []);

    const { data: notifs } = await supabase.from('customer_notifications').select('*').order('notified_at', { ascending: true });
    const grouped = {};
    (notifs || []).forEach(n => { grouped[n.jacket_line_id] = grouped[n.jacket_line_id] || []; grouped[n.jacket_line_id].push(n); });
    setNotificationsByLine(grouped);

    const { data: cl } = await supabase.from('jacket_commodity_loads').select('*, jackets(jacket_number), products(commodity, pack_size), suppliers(company)').order('jacket_id');
    setCommodityLoads(cl || []);

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

  // ---- jacket-level actual loaded, by commodity ----
  async function updateCommodityLoad(jacketId, productId, supplierId, value) {
    const existing = commodityLoads.find(c => c.jacket_id === jacketId && c.product_id === productId && c.supplier_id === supplierId);
    let error;
    if (existing) {
      ({ error } = await supabase.from('jacket_commodity_loads').update({ actual_cases_loaded: value }).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('jacket_commodity_loads').insert({ jacket_id: jacketId, product_id: productId, supplier_id: supplierId, actual_cases_loaded: value }));
    }
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }

  // ---- order-level fields (ordered amend, delivered) ----
  async function updateField(id, fieldName, value) {
    const { error } = await supabase.from('jacket_lines').update({ [fieldName]: value, updated_at: new Date().toISOString() }).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }
  function openAmend(line) { setAmendingLineId(line.jacket_line_id); setAmendValue(line.order_lines?.cases_ordered ?? ''); }
  async function saveAmend(line) {
    const { error } = await supabase.from('order_lines').update({
      cases_ordered: Number(amendValue), amended_at: new Date().toISOString()
    }).eq('order_line_id', line.order_line_id);
    if (error) { alert('Amend failed: ' + error.message); return; }
    setAmendingLineId(null);
    load();
  }

  async function logNotification(jacketLineId, type) {
    const { error } = await supabase.from('customer_notifications').insert({ jacket_line_id: jacketLineId, notification_type: type });
    if (error) { alert('Could not log: ' + error.message); return; }
    load();
  }
  async function removeNotification(id) {
    const { error } = await supabase.from('customer_notifications').delete().eq('notification_id', id);
    if (error) { alert('Could not remove: ' + error.message); return; }
    load();
  }
  async function updateDelivered(id, value) {
    const { error } = await supabase.from('jacket_lines').update({
      actual_cases_delivered: value, quantity_updated_at: new Date().toISOString()
    }).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }

  // ---- reassign an allocation to a different order/customer ----
  async function openReassign(line) {
    const { data } = await supabase
      .from('order_lines')
      .select('order_line_id, cases_ordered, customer_orders(acumatica_order_no, order_status, customers(company))')
      .eq('product_id', line.order_lines?.product_id)
      .neq('order_line_id', line.order_line_id);
    setReassignOptions((data || []).filter(ol => ol.customer_orders?.order_status === 'Open'));
    setReassignTarget('');
    setReassigningId(line.jacket_line_id);
  }
  async function saveReassign(line) {
    if (!reassignTarget) { alert('Pick which order to move this to.'); return; }
    const { error } = await supabase.from('jacket_lines').update({
      order_line_id: Number(reassignTarget), quantity_updated_at: new Date().toISOString()
    }).eq('jacket_line_id', line.jacket_line_id);
    if (error) { alert('Reassign failed: ' + error.message); return; }
    setReassigningId(null);
    load();
  }

  // ---- claims ----
  async function saveClaim() {
    if (!claimForm.jacket_line_id || !claimForm.description) { alert('Pick a jacket line and describe the issue.'); return; }
    const line = lines.find(l => l.jacket_line_id === Number(claimForm.jacket_line_id));
    const { error } = await supabase.from('claims').insert({
      jacket_line_id: Number(claimForm.jacket_line_id),
      claim_type: claimForm.claim_type,
      description: claimForm.description,
      status: 'Open',
      snapshot_jacket_number: line?.jackets?.jacket_number || null,
      snapshot_order_no: line?.order_lines?.customer_orders?.acumatica_order_no || null,
      snapshot_customer: line?.order_lines?.customer_orders?.customers?.company || null,
      snapshot_commodity: line?.order_lines?.products?.commodity || null,
    });
    if (error) { alert('Save failed: ' + error.message); return; }
    setClaimForm({ jacket_line_id: '', claim_type: 'Quality', description: '' });
    setShowClaimForm(false);
    load();
  }

  function openResolve(claim) {
    setResolveForm({ status: claim.status === 'Open' ? 'Resolved' : claim.status, resolution: claim.resolution || '', price_adjustment: claim.resolution_price_adjustment || '', jacket_line_id: claim.jacket_line_id || '' });
    setResolvingId(claim.claim_id);
  }
  async function deleteClaim(claimId) {
    if (!confirm('Delete this claim? This cannot be undone.')) return;
    const { error } = await supabase.from('claims').delete().eq('claim_id', claimId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    load();
  }

  // ---- move cases: split part of an allocation off to a different order ----
  async function openMoveCases(claim) {
    const line = lines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) { alert('This claim has no jacket line attached — nothing to move.'); return; }
    const { data } = await supabase
      .from('order_lines')
      .select('order_line_id, customer_orders(acumatica_order_no, order_status, customers(company))')
      .eq('product_id', line.order_lines?.product_id)
      .neq('order_line_id', line.order_line_id);
    setMoveCasesOptions((data || []).filter(ol => ol.customer_orders?.order_status === 'Open'));
    setMoveCasesForm({ target_order_line_id: '', cases: '' });
    setMovingClaimId(claim.claim_id);
  }
  async function saveMoveCases(claim) {
    const line = lines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) return;
    const cases = Number(moveCasesForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many cases to move.'); return; }
    if (!moveCasesForm.target_order_line_id) { alert('Pick which order to move them to.'); return; }
    if (cases > Number(line.cases_to_load)) { alert(`Only ${line.cases_to_load} cases are on this allocation.`); return; }

    const { error: updateErr } = await supabase.from('jacket_lines').update({
      cases_to_load: Number(line.cases_to_load) - cases, quantity_updated_at: new Date().toISOString()
    }).eq('jacket_line_id', line.jacket_line_id);
    if (updateErr) { alert('Move failed: ' + updateErr.message); return; }

    const { error: insertErr } = await supabase.from('jacket_lines').insert({
      jacket_id: line.jacket_id, order_line_id: Number(moveCasesForm.target_order_line_id),
      jacket_product_line_id: line.jacket_product_line_id, allocated_cost_per_case: line.allocated_cost_per_case,
      planned_cases: cases, cases_to_load: cases, actual_cases_loaded: 0, actual_cases_delivered: 0, load_status: line.load_status,
      quantity_updated_at: new Date().toISOString(),
    });
    if (insertErr) { alert('Move partly failed: ' + insertErr.message); return; }
    setMovingClaimId(null);
    load();
  }

  // ---- compensation: extra cases given free, never billed ----
  function openCompensation(claim) { setCompensationForm({ cases: '', notes: '' }); setCompensatingClaimId(claim.claim_id); }
  async function saveCompensation(claim) {
    const line = lines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) { alert('This claim has no jacket line attached.'); return; }
    const cases = Number(compensationForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many compensation cases.'); return; }
    const { error } = await supabase.from('jacket_lines').update({
      compensation_cases: Number(line.compensation_cases || 0) + cases,
      compensation_notes: compensationForm.notes || line.compensation_notes,
      actual_cases_delivered: Number(line.actual_cases_delivered || 0) + cases,
      quantity_updated_at: new Date().toISOString(),
    }).eq('jacket_line_id', line.jacket_line_id);
    if (error) { alert('Save failed: ' + error.message); return; }
    setCompensatingClaimId(null);
    load();
  }
  async function saveResolve(claim) {
    const adjustment = resolveForm.price_adjustment ? Number(resolveForm.price_adjustment) : null;
    const newJacketLineId = resolveForm.jacket_line_id ? Number(resolveForm.jacket_line_id) : null;
    const reassigned = newJacketLineId !== (claim.jacket_line_id || null);
    let snapshotUpdate = {};
    if (reassigned && newJacketLineId) {
      const line = lines.find(l => l.jacket_line_id === newJacketLineId);
      snapshotUpdate = {
        snapshot_jacket_number: line?.jackets?.jacket_number || null,
        snapshot_order_no: line?.order_lines?.customer_orders?.acumatica_order_no || null,
        snapshot_customer: line?.order_lines?.customer_orders?.customers?.company || null,
        snapshot_commodity: line?.order_lines?.products?.commodity || null,
      };
    }
    const { error } = await supabase.from('claims').update({
      status: resolveForm.status,
      resolution: resolveForm.resolution,
      resolution_price_adjustment: adjustment,
      resolved_at: resolveForm.status === 'Resolved' ? new Date().toISOString() : null,
      flag_for_credit_memo: !!adjustment,
      jacket_line_id: newJacketLineId,
      ...snapshotUpdate,
    }).eq('claim_id', claim.claim_id);
    if (error) { alert('Save failed: ' + error.message); return; }

    if (adjustment) {
      const lineId = newJacketLineId || claim.jacket_line_id;
      const line = lines.find(l => l.jacket_line_id === lineId);
      const ol = line?.order_lines || claim.jacket_lines?.order_lines;
      if (ol) {
        const newPrice = Number(ol.sell_price_per_case) - adjustment;
        const orderLineId = ol.order_line_id || claim.jacket_lines?.order_lines?.order_line_id;
        if (orderLineId) {
          const { error: priceError } = await supabase.from('order_lines').update({ sell_price_per_case: newPrice }).eq('order_line_id', orderLineId);
          if (priceError) alert('Claim saved, but price update failed: ' + priceError.message);
        }
      }
    }
    setResolvingId(null);
    load();
  }

  async function updateExtra(id, fieldName, value) {
    const { error } = await supabase.from('jacket_extras').update({ [fieldName]: value }).eq('extra_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }
  async function addToOrder(extra) {
    if (!addToOrderForm.order_id || !addToOrderForm.supplier_id) { alert('Pick both an order and a supplier.'); return; }
    const { error } = await supabase.from('order_lines').insert({
      customer_order_id: Number(addToOrderForm.order_id), supplier_id: Number(addToOrderForm.supplier_id),
      product_id: extra.product_id, cases_ordered: extra.cases, original_cases_ordered: extra.cases, line_status: 'Open',
    });
    if (error) { alert('Failed to add to order: ' + error.message); return; }
    const orderLabel = openOrders.find(o => o.customer_order_id === Number(addToOrderForm.order_id))?.acumatica_order_no;
    await supabase.from('jacket_extras').update({ status: 'Sold', resolution_notes: `Added to order ${orderLabel}` }).eq('extra_id', extra.extra_id);
    setAddToOrderId(null);
    setAddToOrderForm({ order_id: '', supplier_id: '' });
    load();
  }

  const filteredLines = jacketFilter === 'all' ? lines : lines.filter(l => l.jacket_id === Number(jacketFilter));
  const filteredClaims = jacketFilter === 'all' ? claims : claims.filter(c => (c.jacket_lines?.jacket_id || null) === Number(jacketFilter));
  const filteredExtras = jacketFilter === 'all' ? extras : extras.filter(x => x.jacket_id === Number(jacketFilter));
  const filteredCommodityLoads = jacketFilter === 'all' ? commodityLoads : commodityLoads.filter(c => c.jacket_id === Number(jacketFilter));

  // group commodity totals PER SHIPPER: ordered = sum of cases_to_load for
  // that jacket+product+supplier, loaded = jacket_commodity_loads row
  const commodityGroups = {};
  filteredLines.forEach(l => {
    const pid = l.order_lines?.product_id;
    const sid = l.order_lines?.supplier_id;
    if (!pid) return;
    const key = l.jacket_id + '-' + pid + '-' + sid;
    if (!commodityGroups[key]) {
      commodityGroups[key] = { jacketId: l.jacket_id, jacketNumber: l.jackets?.jacket_number, productId: pid, supplierId: sid, supplierName: l.order_lines?.suppliers?.company, commodity: l.order_lines?.products?.commodity, packSize: l.order_lines?.products?.pack_size, ordered: 0, delivered: 0 };
    }
    commodityGroups[key].ordered += Number(l.cases_to_load || 0);
    commodityGroups[key].delivered += Number(l.actual_cases_delivered || 0);
  });
  Object.values(commodityGroups).forEach(g => {
    const loadRow = commodityLoads.find(c => c.jacket_id === g.jacketId && c.product_id === g.productId && c.supplier_id === g.supplierId);
    g.loaded = loadRow ? Number(loadRow.actual_cases_loaded || 0) : 0;
    g.remaining = g.loaded - g.delivered;
  });
  const groupList = Object.values(commodityGroups);

  // flags for row highlighting
  const flags = {};
  groupList.forEach(g => {
    const anyPlanned = filteredLines.some(l => l.jacket_id === g.jacketId && l.order_lines?.product_id === g.productId && l.order_lines?.supplier_id === g.supplierId && l.load_status === 'Planned');
    const shortage = !anyPlanned && g.loaded > 0 && g.loaded !== g.ordered;
    filteredLines.filter(l => l.jacket_id === g.jacketId && l.order_lines?.product_id === g.productId && l.order_lines?.supplier_id === g.supplierId).forEach(l => {
      flags[l.jacket_line_id] = { commodityShortage: shortage };
    });
  });
  filteredLines.forEach(l => {
    const f = flags[l.jacket_line_id] || {};
    f.deliveryMismatch = Number(l.cases_to_load || 0) > 0 && Number(l.actual_cases_delivered || 0) > 0 && Number(l.cases_to_load) !== Number(l.actual_cases_delivered);
    flags[l.jacket_line_id] = f;
  });

  const remainingOnTruck = groupList.filter(g => g.remaining > 0);

  return (
    <AppShell title="Load Tracking">
      <div style={{ color: 'var(--fo-text-dim)', fontSize: 13, marginBottom: 12 }}>Track load progress, document BOLs, log customer notifications, and catch discrepancies before they become problems.</div>
      <label style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>Viewing
        <select value={jacketFilter} onChange={e => setJacketFilter(e.target.value)} style={{ display: 'block', padding: '6px 8px', marginTop: 4, width: 220 }}>
          <option value="all">All Jackets</option>
          {jackets.map(j => <option key={j.jacket_id} value={j.jacket_id}>{j.jacket_number}</option>)}
        </select>
      </label>

      {/* ---- Jacket-level: Actual Loaded by Commodity, per Shipper ---- */}
      {groupList.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, color: 'var(--fo-primary)', marginBottom: 6 }}>Actual Loaded by Commodity, per Shipper (whole truck)</div>
          <table style={table} className="fo-table">
            <thead><tr style={trHead}><th>Jacket</th><th>Shipper</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Total Ordered</th><th style={{ textAlign: 'right' }}>Actual Loaded</th><th style={{ textAlign: 'right' }}>Variance</th></tr></thead>
            <tbody>{groupList.map(g => {
              const variance = g.loaded - g.ordered;
              return (
                <tr key={g.jacketId + '-' + g.productId + '-' + g.supplierId} style={variance !== 0 && g.loaded > 0 ? { ...tr, background: 'var(--fo-warn-bg)' } : tr}>
                  <td style={{ fontFamily: 'monospace' }}>{g.jacketNumber}</td>
                  <td>{g.supplierName || '—'}</td>
                  <td>{g.commodity} — {g.packSize}</td>
                  <td style={{ textAlign: 'right' }}>{g.ordered}</td>
                  <td style={{ textAlign: 'right' }}><input type="number" defaultValue={g.loaded} onBlur={e => updateCommodityLoad(g.jacketId, g.productId, g.supplierId, Number(e.target.value))} style={{ width: 70 }} /></td>
                  <td style={{ textAlign: 'right', fontWeight: variance !== 0 ? 700 : 400 }}>{variance > 0 ? '+' : ''}{variance}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}

      {filteredLines.length === 0 ? (
        <p style={{ color: 'var(--fo-text-faint)' }}>No jacket lines yet — assign order lines to a Jacket first.</p>
      ) : (
        <>
          <div style={{ fontWeight: 600, color: 'var(--fo-primary)', marginBottom: 6 }}>Per-Order Detail, by Commodity</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'var(--fo-warn-bg)', display: 'inline-block', borderRadius: 2 }}></span> Commodity loaded ≠ ordered</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 12, height: 12, background: 'var(--fo-error-bg)', display: 'inline-block', borderRadius: 2 }}></span> Delivered ≠ assigned to this jacket</span>
          </div>
          {groupList.map(g => {
            const groupLines = filteredLines.filter(l => l.jacket_id === g.jacketId && l.order_lines?.product_id === g.productId && l.order_lines?.supplier_id === g.supplierId);
            if (groupLines.length === 0) return null;
            const variance = g.loaded - g.ordered;
            return (
              <div key={g.jacketId + '-' + g.productId + '-' + g.supplierId} style={{ ...card, marginBottom: 14, padding: 0, overflow: 'hidden' }}>
                <div style={{ background: variance !== 0 && g.loaded > 0 ? 'var(--fo-warn-bg)' : 'var(--fo-section-bg)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <div><strong style={{ fontFamily: 'monospace' }}>{g.jacketNumber}</strong> · <strong>{g.commodity} — {g.packSize}</strong> · {g.supplierName || 'no supplier'}</div>
                  <div style={{ color: 'var(--fo-text-dim)' }}>Ordered {g.ordered} · Loaded {g.loaded}{variance !== 0 && g.loaded > 0 ? ` · Variance ${variance > 0 ? '+' : ''}${variance}` : ''}</div>
                </div>
                <table style={{ ...table, border: 'none', borderRadius: 0 }}>
                  <thead><tr style={trHead}><th>Customer</th><th>Order #</th><th style={{ textAlign: 'right' }}>Ordered</th><th>Actual Delivered</th><th>BOL #</th><th>Load Status</th><th>Customer Told</th><th>Exception / Notes</th><th></th></tr></thead>
                  <tbody>{groupLines.map(jl => {
                    const f = flags[jl.jacket_line_id] || {};
                    const rowStyle = f.deliveryMismatch ? { ...tr, background: 'var(--fo-error-bg)' } : tr;
                    const amended = jl.order_lines?.original_cases_ordered != null && Number(jl.order_lines.original_cases_ordered) !== Number(jl.order_lines?.cases_ordered);
                    return (
                      <Fragment key={jl.jacket_line_id}>
                        <tr style={rowStyle}>
                          <td>{jl.order_lines?.customer_orders?.customers?.company}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{jl.order_lines?.customer_orders?.acumatica_order_no}</td>
                          <td style={{ textAlign: 'right' }}>
                            {amendingLineId === jl.jacket_line_id ? (
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <input type="number" value={amendValue} onChange={e => setAmendValue(e.target.value)} style={{ width: 60 }} />
                                <button onClick={() => saveAmend(jl)} style={miniBtn}>Save</button>
                                <button onClick={() => setAmendingLineId(null)} style={miniBtn}>X</button>
                              </div>
                            ) : (
                              <>
                                {jl.order_lines?.cases_ordered}
                                {amended && <div style={{ fontSize: 10, color: 'var(--fo-text-faint)' }}>orig: {jl.order_lines.original_cases_ordered} · {jl.order_lines?.amended_at ? new Date(jl.order_lines.amended_at).toLocaleString() : ''}</div>}
                                <div><button onClick={() => openAmend(jl)} style={{ ...miniBtn, marginTop: 2 }}>Amend</button></div>
                              </>
                            )}
                          </td>
                          <td>
                            <input type="number" defaultValue={jl.actual_cases_delivered} onBlur={e => updateDelivered(jl.jacket_line_id, Number(e.target.value))} style={{ width: 64 }} />
                            {jl.compensation_cases > 0 && <div style={{ fontSize: 10, color: 'var(--fo-accent)' }}>incl. {jl.compensation_cases} comp.</div>}
                            {jl.quantity_updated_at && <div style={{ fontSize: 10, color: 'var(--fo-text-faint)' }}>{new Date(jl.quantity_updated_at).toLocaleString()}</div>}
                          </td>
                          <td><input type="text" defaultValue={jl.bol_number || ''} onBlur={e => updateField(jl.jacket_line_id, 'bol_number', e.target.value)} style={{ width: 90 }} placeholder="BOL #" /></td>
                          <td>
                            <select defaultValue={jl.load_status} onChange={e => updateField(jl.jacket_line_id, 'load_status', e.target.value)}>
                              {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={{ minWidth: 160 }}>
                            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
                              {NOTIFICATION_TYPES.map(t => (
                                <button key={t} onClick={() => logNotification(jl.jacket_line_id, t)} style={{ ...miniBtn, background: 'var(--fo-primary)', color: '#fff', border: 'none' }}>+ {t}</button>
                              ))}
                            </div>
                            {(notificationsByLine[jl.jacket_line_id] || []).map(n => (
                              <div key={n.notification_id} style={{ fontSize: 10, color: 'var(--fo-text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ background: 'var(--fo-neutral-bg)', borderRadius: 4, padding: '1px 5px' }}>{n.notification_type}</span>
                                {new Date(n.notified_at).toLocaleString()}
                                <button onClick={() => removeNotification(n.notification_id)} style={{ background: 'none', border: 'none', color: 'var(--fo-error)', cursor: 'pointer', fontSize: 10, padding: 0 }}>✕</button>
                              </div>
                            ))}
                          </td>
                          <td><input type="text" defaultValue={jl.exception_notes || ''} onBlur={e => updateField(jl.jacket_line_id, 'exception_notes', e.target.value)} style={{ width: 150 }} placeholder="Notes" /></td>
                          <td><button onClick={() => openReassign(jl)} style={miniBtn}>Reassign</button></td>
                        </tr>
                        {reassigningId === jl.jacket_line_id && (
                          <tr>
                            <td colSpan={9} style={{ background: 'var(--fo-section-bg)', padding: 10 }}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <label style={{ fontSize: 12 }}>Move this allocation to a different order
                                  <select value={reassignTarget} onChange={e => setReassignTarget(e.target.value)} style={{ display: 'block', padding: '6px 8px', marginTop: 2, minWidth: 260 }}>
                                    <option value="">— select —</option>
                                    {reassignOptions.map(ol => <option key={ol.order_line_id} value={ol.order_line_id}>{ol.customer_orders?.acumatica_order_no} — {ol.customer_orders?.customers?.company}</option>)}
                                  </select>
                                </label>
                                <button onClick={() => saveReassign(jl)} style={{ ...miniBtn, background: 'var(--fo-accent)', color: '#fff', border: 'none' }}>Confirm</button>
                                <button onClick={() => setReassigningId(null)} style={miniBtn}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}</tbody>
                </table>
              </div>
            );
          })}
        </>
      )}

      {/* ---- Claims ---- */}
      <div style={{ marginTop: 24, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--fo-error)' }}>⚠ Claims &amp; Quality Issues</div>
            <div style={{ fontSize: 12, color: 'var(--fo-text-faint)' }}>Operational record only — flag it, then AP/AR issues the actual credit memo in Acumatica.</div>
          </div>
          <button onClick={() => setShowClaimForm(!showClaimForm)} style={{ padding: '6px 14px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ Log Claim</button>
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
            <button onClick={saveClaim} style={{ padding: '8px 16px', background: 'var(--fo-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', gridColumn: 'span 1' }}>Save Claim</button>
          </div>
        )}
        {filteredClaims.length > 0 && (
          <table style={{ ...table, marginTop: 16 }}>
            <thead><tr style={trHead}><th>Jacket</th><th>Order #</th><th>Customer</th><th>Type</th><th>Description</th><th>Commodity</th><th>Opened</th><th>Status</th><th>Price Adj.</th><th></th></tr></thead>
            <tbody>{filteredClaims.map(c => (
              <Fragment key={c.claim_id}>
                <tr style={tr}>
                  <td style={{ fontFamily: 'monospace' }}>{c.jacket_lines?.jackets?.jacket_number || c.snapshot_jacket_number || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.jacket_lines?.order_lines?.customer_orders?.acumatica_order_no || c.snapshot_order_no || '—'}</td>
                  <td>{c.jacket_lines?.order_lines?.customer_orders?.customers?.company || c.snapshot_customer || '—'}</td>
                  <td>{c.claim_type}</td><td>{c.description}</td>
                  <td>{c.jacket_lines?.order_lines?.products?.commodity || c.snapshot_commodity || '—'}</td>
                  <td style={{ color: 'var(--fo-text-faint)', fontSize: 12 }}>{c.date_opened}</td>
                  <td><span style={statusPill(c.status)}>{c.status}</span></td>
                  <td>{c.resolution_price_adjustment ? `-$${Number(c.resolution_price_adjustment).toFixed(2)}/cs` : '—'}</td>
                  <td>
                    <button onClick={() => openResolve(c)} style={editBtn}>{c.status === 'Open' ? 'Resolve' : 'Edit'}</button>{' '}
                    <button onClick={() => openMoveCases(c)} style={editBtn}>Move Cases</button>{' '}
                    <button onClick={() => openCompensation(c)} style={editBtn}>Add Compensation</button>{' '}
                    <button onClick={() => deleteClaim(c.claim_id)} style={{ ...editBtn, color: 'var(--fo-error)' }}>Delete</button>
                  </td>
                </tr>
                {resolvingId === c.claim_id && (
                  <tr>
                    <td colSpan={10} style={{ background: 'var(--fo-section-bg)', padding: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        <label style={{ fontSize: 13 }}>Status
                          <select value={resolveForm.status} onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                            <option>Open</option><option>Under Review</option><option>Resolved</option>
                          </select>
                        </label>
                        <label style={{ fontSize: 13 }}>Jacket Line (reassign if wrong/blank)
                          <select value={resolveForm.jacket_line_id} onChange={e => setResolveForm({ ...resolveForm, jacket_line_id: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                            <option value="">— none —</option>
                            {lines.map(jl => <option key={jl.jacket_line_id} value={jl.jacket_line_id}>{jl.jackets?.jacket_number} — {jl.order_lines?.products?.commodity} — {jl.order_lines?.customer_orders?.customers?.company}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: 13 }}>Price Adjustment ($/case decrease)
                          <input type="number" value={resolveForm.price_adjustment} onChange={e => setResolveForm({ ...resolveForm, price_adjustment: e.target.value })} placeholder="e.g. 2.00" style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }} />
                        </label>
                        <label style={{ fontSize: 13 }}>Resolution Notes
                          <input value={resolveForm.resolution} onChange={e => setResolveForm({ ...resolveForm, resolution: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }} />
                        </label>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 6 }}>A price adjustment reduces that order line's sell price for accurate margin — it never affects Market Call price history or trends.</div>
                      <button onClick={() => saveResolve(c)} style={{ marginTop: 8, marginRight: 8, padding: '6px 16px', background: 'var(--fo-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setResolvingId(null)} style={{ marginTop: 8, padding: '6px 16px', background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                    </td>
                  </tr>
                )}
                {movingClaimId === c.claim_id && (
                  <tr>
                    <td colSpan={10} style={{ background: 'var(--fo-section-bg)', padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginBottom: 8 }}>Move part of this allocation to a different order — useful when a shortage means redistributing what actually arrived.</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: 13 }}>Move to which order?
                          <select value={moveCasesForm.target_order_line_id} onChange={e => setMoveCasesForm({ ...moveCasesForm, target_order_line_id: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, minWidth: 240 }}>
                            <option value="">— select —</option>
                            {moveCasesOptions.map(ol => <option key={ol.order_line_id} value={ol.order_line_id}>{ol.customer_orders?.acumatica_order_no} — {ol.customer_orders?.customers?.company}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: 13 }}>Cases to move
                          <input type="number" value={moveCasesForm.cases} onChange={e => setMoveCasesForm({ ...moveCasesForm, cases: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, width: 90 }} />
                        </label>
                        <button onClick={() => saveMoveCases(c)} style={{ padding: '6px 16px', background: 'var(--fo-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Confirm</button>
                        <button onClick={() => setMovingClaimId(null)} style={{ padding: '6px 16px', background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
                {compensatingClaimId === c.claim_id && (
                  <tr>
                    <td colSpan={10} style={{ background: 'var(--fo-section-bg)', padding: 12 }}>
                      <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginBottom: 8 }}>Add extra cases at no charge — this increases what's physically delivered without touching the customer's price or billed quantity.</div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: 13 }}>Compensation cases
                          <input type="number" value={compensationForm.cases} onChange={e => setCompensationForm({ ...compensationForm, cases: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, width: 90 }} />
                        </label>
                        <label style={{ fontSize: 13 }}>Notes
                          <input value={compensationForm.notes} onChange={e => setCompensationForm({ ...compensationForm, notes: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, minWidth: 220 }} />
                        </label>
                        <button onClick={() => saveCompensation(c)} style={{ padding: '6px 16px', background: 'var(--fo-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Confirm</button>
                        <button onClick={() => setCompensatingClaimId(null)} style={{ padding: '6px 16px', background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* ---- Jacket Reconciliation ---- */}
      <div style={{ marginTop: 24, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, color: 'var(--fo-primary)' }}>Jacket Reconciliation</div>
        <div style={{ fontSize: 12, color: 'var(--fo-text-faint)', marginBottom: 12 }}>Product physically on a truck that isn't fully accounted for — loaded but not yet delivered, or rolled/extra product still needing a home.</div>

        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Remaining on Truck</div>
        {remainingOnTruck.length === 0 ? <p style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>Nothing outstanding.</p> : (
          <table style={{ ...table, marginBottom: 20 }}>
            <thead><tr style={trHead}><th>Jacket</th><th>Shipper</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Loaded</th><th style={{ textAlign: 'right' }}>Delivered</th><th style={{ textAlign: 'right' }}>Remaining</th></tr></thead>
            <tbody>{remainingOnTruck.map(g => (
              <tr key={g.jacketId + '-' + g.productId + '-' + g.supplierId} style={tr}>
                <td style={{ fontFamily: 'monospace' }}>{g.jacketNumber}</td>
                <td>{g.supplierName || '—'}</td>
                <td>{g.commodity} — {g.packSize}</td>
                <td style={{ textAlign: 'right' }}>{g.loaded}</td>
                <td style={{ textAlign: 'right' }}>{g.delivered}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{g.remaining}</td>
              </tr>
            ))}</tbody>
          </table>
        )}

        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Rolled / Extra Product to Sell or Resolve</div>
        {filteredExtras.length === 0 ? <p style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>Nothing unresolved right now.</p> : (
          <table style={table} className="fo-table">
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
                    <td colSpan={6} style={{ background: 'var(--fo-section-bg)', padding: 12 }}>
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
                        <button onClick={() => addToOrder(x)} style={{ padding: '8px 16px', background: 'var(--fo-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Confirm</button>
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

function statusPill(status) {
  const colors = { Open: 'var(--fo-warn)', 'Under Review': 'var(--fo-warn)', Resolved: 'var(--fo-success)' };
  return { display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#fff', background: colors[status] || 'var(--fo-text-faint)' };
}
const editBtn = { padding: '6px 13px', fontSize: 12.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer', fontWeight: 500 };
const miniBtn = { padding: '3px 8px', fontSize: 10.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer' };
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm), var(--fo-glow)' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
