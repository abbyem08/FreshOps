// pages/app/jackets.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function JacketsPage() {
  const [jackets, setJackets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [jacketLines, setJacketLines] = useState([]);
  const [stops, setStops] = useState([]);
  const [eligibleLines, setEligibleLines] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({});

  useEffect(() => { loadJackets(); }, []);
  useEffect(() => { if (activeId) loadJacketDetail(activeId); }, [activeId]);

  async function loadJackets() {
    const { data } = await supabase.from('jackets').select('*').order('jacket_number');
    setJackets(data || []);
    if (data && data.length && !activeId) setActiveId(data[0].jacket_id);
  }

  async function loadJacketDetail(jacketId) {
    const { data: lines } = await supabase
      .from('jacket_lines')
      .select('*, order_lines(*, customer_orders(acumatica_order_no, customer_id, customers(company)), suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case))')
      .eq('jacket_id', jacketId);
    setJacketLines(lines || []);

    const { data: stopRows } = await supabase.from('stops').select('*, suppliers(company), customers(company), supplier_locations(label, address, city, state), customer_locations(label, address, city, state), stop_lines(*, jacket_lines(*, order_lines(products(commodity, pack_size))))').eq('jacket_id', jacketId).order('stop_number');
    setStops(stopRows || []);

    // eligible order lines: cases_ordered minus what's already assigned across non-cancelled jackets
    const { data: allLines } = await supabase.from('order_lines').select('*, customer_orders(acumatica_order_no, customer_id, customer_location_id, customers(company)), suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)');
    const { data: allJacketLines } = await supabase.from('jacket_lines').select('order_line_id, cases_to_load, jackets(jacket_status)');
    const eligible = (allLines || []).map(ol => {
      const assigned = (allJacketLines || [])
        .filter(jl => jl.order_line_id === ol.order_line_id && jl.jackets?.jacket_status !== 'Cancelled')
        .reduce((s, jl) => s + Number(jl.cases_to_load || 0), 0);
      return { ...ol, remaining: ol.cases_ordered - assigned };
    }).filter(ol => ol.remaining > 0);
    setEligibleLines(eligible);
  }

  async function createNewJacket() {
    const number = window.prompt('Jacket Number:');
    if (!number) return;
    const { data, error } = await supabase.from('jackets').insert({ jacket_number: number, jacket_status: 'Planning' }).select().single();
    if (error) { alert('Could not create jacket: ' + error.message); return; }
    await loadJackets();
    setActiveId(data.jacket_id);
  }

  async function addLineToJacket(orderLine) {
    const cases = orderLine.remaining;
    const p = orderLine.products;
    const estPallets = p.cases_per_pallet ? Math.ceil(cases / p.cases_per_pallet) : 0;
    const lineWeight = cases * (p.gross_weight_per_case || 0);

    const { data: jl } = await supabase.from('jacket_lines').insert({
      jacket_id: activeId, order_line_id: orderLine.order_line_id, planned_cases: cases, cases_to_load: cases,
      actual_cases_loaded: 0, actual_cases_delivered: 0, estimated_pallets: estPallets, line_weight: lineWeight, load_status: 'Planned'
    }).select().single();

    // find-or-create pickup + delivery stops
    const supplierId = orderLine.supplier_id;
    const supplierLocId = orderLine.supplier_location_id || null;
    const customerId = orderLine.customer_orders.customer_id;
    const customerLocId = orderLine.customer_orders.customer_location_id || null;
    const pickupStop = await findOrCreateStop(activeId, 'Pickup', supplierId, supplierLocId, null, null);
    const deliveryStop = await findOrCreateStop(activeId, 'Delivery', null, null, customerId, customerLocId);

    await supabase.from('stop_lines').insert([
      { stop_id: pickupStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
      { stop_id: deliveryStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
    ]);

    setShowAdd(false);
    loadJacketDetail(activeId);
  }

  async function findOrCreateStop(jacketId, type, supplierId, supplierLocId, customerId, customerLocId) {
    let query = supabase.from('stops').select('*').eq('jacket_id', jacketId).eq('stop_type', type);
    if (type === 'Pickup') {
      query = query.eq('supplier_id', supplierId);
      query = supplierLocId ? query.eq('supplier_location_id', supplierLocId) : query.is('supplier_location_id', null);
    } else {
      query = query.eq('customer_id', customerId);
      query = customerLocId ? query.eq('customer_location_id', customerLocId) : query.is('customer_location_id', null);
    }
    const { data: existing } = await query.maybeSingle();
    if (existing) return existing;
    const { data: existingStops } = await supabase.from('stops').select('stop_id').eq('jacket_id', jacketId);
    const nextNum = (existingStops?.length || 0) + 1;
    const { data: created } = await supabase.from('stops').insert({
      jacket_id: jacketId, stop_number: nextNum, stop_type: type, supplier_id: supplierId, supplier_location_id: supplierLocId,
      customer_id: customerId, customer_location_id: customerLocId, status: 'Planned'
    }).select().single();
    return created;
  }

  async function updateJacketDetails() {
    if (!detailsForm.jacket_number) { alert('Jacket Number is required.'); return; }
    const { error } = await supabase.from('jackets').update({
      jacket_number: detailsForm.jacket_number,
      jacket_date: detailsForm.jacket_date || null,
      carrier: detailsForm.carrier || null,
      driver: detailsForm.driver || null,
      driver_phone: detailsForm.driver_phone || null,
      truck: detailsForm.truck || null,
      trailer: detailsForm.trailer || null,
      route: detailsForm.route || null,
      jacket_status: detailsForm.jacket_status,
      weight_capacity: Number(detailsForm.weight_capacity) || null,
      pallet_capacity: Number(detailsForm.pallet_capacity) || null,
    }).eq('jacket_id', activeId);
    if (error) { alert('Update failed: ' + error.message + (error.message.includes('duplicate') ? ' — that jacket number is already in use.' : '')); return; }
    setEditingDetails(false);
    await loadJackets();
    loadJacketDetail(activeId);
  }
  function openEditDetails() {
    setDetailsForm({ ...activeJacket });
    setEditingDetails(true);
  }

  async function removeLine(jacketLineId) {
    const { error: slErr } = await supabase.from('stop_lines').delete().eq('jacket_line_id', jacketLineId);
    if (slErr) { alert('Could not remove: ' + slErr.message); return; }
    const { error: jlErr } = await supabase.from('jacket_lines').delete().eq('jacket_line_id', jacketLineId);
    if (jlErr) { alert('Could not remove: ' + jlErr.message); return; }
    loadJacketDetail(activeId);
  }

  async function updateCases(jacketLineId, cases, orderLine) {
    const p = orderLine.products;
    const estPallets = p.cases_per_pallet ? Math.ceil(cases / p.cases_per_pallet) : 0;
    const lineWeight = cases * (p.gross_weight_per_case || 0);
    await supabase.from('jacket_lines').update({ cases_to_load: cases, planned_cases: cases, estimated_pallets: estPallets, line_weight: lineWeight }).eq('jacket_line_id', jacketLineId);
    await supabase.from('stop_lines').update({ cases_at_stop: cases, pallets_at_stop: estPallets }).eq('jacket_line_id', jacketLineId);
    loadJacketDetail(activeId);
  }

  const activeJacket = jackets.find(j => j.jacket_id === activeId);
  const totalWeight = jacketLines.reduce((s, jl) => s + Number(jl.line_weight || 0), 0);
  // group by product before rounding up to pallets — otherwise two lines of the
  // same product each round up separately and overcount (e.g. 100 + 300 cases
  // at 40/pallet should be 10 pallets total, not ceil(100/40)+ceil(300/40)=11)
  const casesByProduct = {};
  jacketLines.forEach(jl => {
    const pid = jl.order_lines.product_id;
    if (!casesByProduct[pid]) casesByProduct[pid] = { cases: 0, perPallet: jl.order_lines.products.cases_per_pallet };
    casesByProduct[pid].cases += Number(jl.cases_to_load || 0);
  });
  const totalPallets = Object.values(casesByProduct).reduce((s, g) => s + (g.perPallet ? Math.ceil(g.cases / g.perPallet) : 0), 0);

  return (
    <AppShell title="Jackets">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select value={activeId || ''} onChange={e => setActiveId(Number(e.target.value))} style={{ padding: '6px 10px', border: '1px solid #DCD5C1', borderRadius: 6, fontSize: 13, fontFamily: 'monospace' }}>
          {jackets.map(j => <option key={j.jacket_id} value={j.jacket_id}>{j.jacket_number}</option>)}
        </select>
        <button onClick={createNewJacket} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: '1px solid #6B8E4E', background: '#fff', color: '#6B8E4E', fontWeight: 600 }}>+ New Jacket</button>
      </div>

      {activeJacket && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#2F5233' }}>Jacket {activeJacket.jacket_number} — {activeJacket.jacket_status}</strong>
              <span style={{ fontSize: 12, color: '#78716c' }}>{totalWeight.toLocaleString()} lb · {totalPallets} pallets</span>
            </div>

            {editingDetails ? (
              <div style={{ border: '1px solid #DCD5C1', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {detailField('Jacket Number', 'jacket_number', detailsForm, setDetailsForm)}
                  {detailField('Jacket Date', 'jacket_date', detailsForm, setDetailsForm, 'date')}
                  {detailField('Carrier', 'carrier', detailsForm, setDetailsForm)}
                  {detailField('Driver', 'driver', detailsForm, setDetailsForm)}
                  {detailField('Driver Phone', 'driver_phone', detailsForm, setDetailsForm)}
                  {detailField('Truck #', 'truck', detailsForm, setDetailsForm)}
                  {detailField('Trailer #', 'trailer', detailsForm, setDetailsForm)}
                  {detailField('Route', 'route', detailsForm, setDetailsForm)}
                  <label style={{ fontSize: 13 }}>Status
                    <select value={detailsForm.jacket_status || 'Planning'} onChange={e => setDetailsForm({ ...detailsForm, jacket_status: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                      {['Planning', 'Booked', 'Loading', 'Dispatched', 'In Transit', 'Delivered', 'Closed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                  {detailField('Weight Capacity (lb)', 'weight_capacity', detailsForm, setDetailsForm, 'number')}
                  {detailField('Pallet Capacity', 'pallet_capacity', detailsForm, setDetailsForm, 'number')}
                </div>
                <button onClick={updateJacketDetails} style={{ marginTop: 10, marginRight: 8, padding: '6px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save Details</button>
                <button onClick={() => setEditingDetails(false)} style={{ marginTop: 10, padding: '6px 16px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              </div>
            ) : (
              <button onClick={openEditDetails} style={{ marginBottom: 12, padding: '6px 14px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Edit Jacket Details</button>
            )}
            <table style={table}>
              <thead><tr style={trHead}><th>Order Line</th><th>Cases to Load</th><th></th></tr></thead>
              <tbody>{jacketLines.map(jl => (
                <tr key={jl.jacket_line_id} style={tr}>
                  <td>{jl.order_lines.customer_orders.acumatica_order_no} | {jl.order_lines.products.commodity} — {jl.order_lines.products.pack_size} | {jl.order_lines.suppliers.company}</td>
                  <td><input type="number" defaultValue={jl.cases_to_load} onBlur={e => updateCases(jl.jacket_line_id, Number(e.target.value), jl.order_lines)} style={{ width: 70 }} /></td>
                  <td><button onClick={() => removeLine(jl.jacket_line_id)} style={{ background: 'none', border: 'none', color: '#a8a29e', cursor: 'pointer' }}>✕</button></td>
                </tr>
              ))}</tbody>
            </table>
            <button onClick={() => setShowAdd(!showAdd)} style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 8, padding: '4px 0' }}>+ Add Order Line</button>
            {showAdd && (
              <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto', border: '1px solid #DCD5C1', borderRadius: 6, padding: 8 }}>
                {eligibleLines.length === 0 && <div style={{ color: '#a8a29e', fontSize: 13 }}>No eligible order lines.</div>}
                {eligibleLines.map(ol => (
                  <button key={ol.order_line_id} onClick={() => addLineToJacket(ol)} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{ol.customer_orders.acumatica_order_no} | {ol.products.commodity} — {ol.products.pack_size} | {ol.suppliers.company}</span>
                    <span style={{ color: '#78716c' }}>{ol.remaining} avail</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={card}>
            <strong>Stops</strong>
            <div style={{ fontSize: 12, color: '#a8a29e', marginBottom: 8 }}>Auto-derived from assigned order lines.</div>
            {stops.map(s => {
              const loc = s.stop_type === 'Pickup' ? s.supplier_locations : s.customer_locations;
              const partyName = s.stop_type === 'Pickup' ? s.suppliers?.company : s.customers?.company;
              return (
                <div key={s.stop_id} style={{ fontSize: 13, borderBottom: '1px solid #DCD5C1', paddingBottom: 8, marginBottom: 8 }}>
                  <div><strong>#{s.stop_number} {s.stop_type}</strong></div>
                  <div style={{ color: '#78716c' }}>{partyName}{loc ? ` — ${loc.label}` : ''}</div>
                  {loc && <div style={{ color: '#a8a29e', fontSize: 11 }}>{loc.address}, {loc.city} {loc.state}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function detailField(label, key, form, setForm, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>{label}
      <input type={type} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }} />
    </label>
  );
}
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
