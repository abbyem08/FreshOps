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

    const { data: stopRows } = await supabase.from('stops').select('*, suppliers(company), customers(company), stop_lines(*, jacket_lines(*, order_lines(products(commodity, pack_size))))').eq('jacket_id', jacketId).order('stop_number');
    setStops(stopRows || []);

    // eligible order lines: cases_ordered minus what's already assigned across non-cancelled jackets
    const { data: allLines } = await supabase.from('order_lines').select('*, customer_orders(acumatica_order_no, customer_id, customers(company)), suppliers(company), products(commodity, pack_size)');
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
    const nums = jackets.map(j => Number(j.jacket_number)).filter(n => !isNaN(n));
    const next = String((nums.length ? Math.max(...nums) : 200999) + 1);
    const { data } = await supabase.from('jackets').insert({ jacket_number: next, jacket_status: 'Planning' }).select().single();
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
    const customerId = orderLine.customer_orders.customer_id;
    const pickupStop = await findOrCreateStop(activeId, 'Pickup', supplierId, null);
    const deliveryStop = await findOrCreateStop(activeId, 'Delivery', null, customerId);

    await supabase.from('stop_lines').insert([
      { stop_id: pickupStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
      { stop_id: deliveryStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
    ]);

    setShowAdd(false);
    loadJacketDetail(activeId);
  }

  async function findOrCreateStop(jacketId, type, supplierId, customerId) {
    const { data: existing } = await supabase.from('stops').select('*').eq('jacket_id', jacketId).eq('stop_type', type)
      .eq(type === 'Pickup' ? 'supplier_id' : 'customer_id', type === 'Pickup' ? supplierId : customerId).maybeSingle();
    if (existing) return existing;
    const { data: existingStops } = await supabase.from('stops').select('stop_id').eq('jacket_id', jacketId);
    const nextNum = (existingStops?.length || 0) + 1;
    const { data: created } = await supabase.from('stops').insert({
      jacket_id: jacketId, stop_number: nextNum, stop_type: type, supplier_id: supplierId, customer_id: customerId, status: 'Planned'
    }).select().single();
    return created;
  }

  async function removeLine(jacketLineId) {
    await supabase.from('stop_lines').delete().eq('jacket_line_id', jacketLineId);
    await supabase.from('jacket_lines').delete().eq('jacket_line_id', jacketLineId);
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
  const totalPallets = jacketLines.reduce((s, jl) => s + Number(jl.estimated_pallets || 0), 0);

  return (
    <AppShell title="Jackets">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {jackets.map(j => (
          <button key={j.jacket_id} onClick={() => setActiveId(j.jacket_id)}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', cursor: 'pointer', border: '1px solid #DCD5C1', background: activeId === j.jacket_id ? '#2F5233' : '#fff', color: activeId === j.jacket_id ? '#fff' : '#333' }}>
            {j.jacket_number}
          </button>
        ))}
        <button onClick={createNewJacket} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: '1px solid #6B8E4E', background: '#fff', color: '#6B8E4E', fontWeight: 600 }}>+ New Jacket</button>
      </div>

      {activeJacket && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#2F5233' }}>Jacket {activeJacket.jacket_number} — {activeJacket.jacket_status}</strong>
              <span style={{ fontSize: 12, color: '#78716c' }}>{totalWeight.toLocaleString()} lb · {totalPallets} pallets</span>
            </div>
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
            {stops.map(s => (
              <div key={s.stop_id} style={{ fontSize: 13, borderBottom: '1px solid #DCD5C1', paddingBottom: 8, marginBottom: 8 }}>
                <div><strong>#{s.stop_number} {s.stop_type}</strong></div>
                <div style={{ color: '#78716c' }}>{s.stop_type === 'Pickup' ? s.suppliers?.company : s.customers?.company}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
