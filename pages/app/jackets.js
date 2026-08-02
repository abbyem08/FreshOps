// pages/app/jackets.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK_PURCHASED = { supplier_id: '', product_id: '', shipper_po: '', purchased_cases: '', actual_cases_received: '', purchase_cost_per_case: '', fee_total_per_case: '', notes: '' };

export default function JacketsPage() {
  const [jackets, setJackets] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [jacketLines, setJacketLines] = useState([]);
  const [stops, setStops] = useState([]);
  const [eligibleLines, setEligibleLines] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({});
  const [purchasedLines, setPurchasedLines] = useState([]);
  const [showAddPurchased, setShowAddPurchased] = useState(false);
  const [purchasedForm, setPurchasedForm] = useState(BLANK_PURCHASED);
  const [editingPurchasedId, setEditingPurchasedId] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [allocatingLineId, setAllocatingLineId] = useState(null);
  const [allocateForm, setAllocateForm] = useState({ order_line_id: '', cases: '' });
  const [allOrderLinesNeed, setAllOrderLinesNeed] = useState([]);
  const [allPurchasedLines, setAllPurchasedLines] = useState([]);
  const [allJacketLinesGlobal, setAllJacketLinesGlobal] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', cases: '' });
  const [demandAllocateFor, setDemandAllocateFor] = useState(null);
  const [demandAllocateForm, setDemandAllocateForm] = useState({ purchased_line_id: '', cases: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { loadJackets(); loadMasters(); }, []);
  useEffect(() => { if (activeId) loadJacketDetail(activeId); }, [activeId]);

  async function loadMasters() {
    const { data: s } = await supabase.from('suppliers').select('supplier_id, company').order('company');
    setSuppliers(s || []);
    const { data: p } = await supabase.from('products').select('product_id, commodity, pack_size, cases_per_pallet, gross_weight_per_case').order('commodity');
    setProducts(p || []);
    const { data: c } = await supabase.from('customers').select('customer_id, company').order('company');
    setCustomers(c || []);
  }

  async function loadJackets() {
    const { data } = await supabase.from('jackets').select('*').order('jacket_number');
    setJackets(data || []);
    if (data && data.length && !activeId) setActiveId(data[0].jacket_id);
  }

  async function loadJacketDetail(jacketId) {
    const { data: lines } = await supabase
      .from('jacket_lines')
      .select('*, order_lines(*, customer_orders(acumatica_order_no, customer_id, customers(company)), suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)), jacket_product_lines(suppliers(company))')
      .eq('jacket_id', jacketId);
    setJacketLines(lines || []);

    const { data: stopRows } = await supabase.from('stops').select('*, suppliers(company), customers(company), supplier_locations(label, address, city, state), customer_locations(label, address, city, state), stop_lines(*, jacket_lines(*, order_lines(products(commodity, pack_size))))').eq('jacket_id', jacketId).order('stop_number');
    setStops(stopRows || []);

    // eligible order lines: cases_ordered minus what's already assigned across non-cancelled jackets
    const { data: allLines } = await supabase.from('order_lines').select('*, customer_orders(acumatica_order_no, customer_id, customer_location_id, customers(company)), suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)');
    const { data: allJacketLines } = await supabase.from('jacket_lines').select('order_line_id, cases_to_load, jacket_product_line_id, jackets(jacket_status)');
    setAllJacketLinesGlobal(allJacketLines || []);
    const eligible = (allLines || []).map(ol => {
      const assigned = (allJacketLines || [])
        .filter(jl => jl.order_line_id === ol.order_line_id && jl.jackets?.jacket_status !== 'Cancelled')
        .reduce((s, jl) => s + Number(jl.cases_to_load || 0), 0);
      return { ...ol, remaining: ol.cases_ordered - assigned };
    }).filter(ol => ol.remaining > 0);
    setEligibleLines(eligible);

    // purchased product lines for this jacket
    const { data: purchased } = await supabase.from('jacket_product_lines').select('*, suppliers(company), products(commodity, pack_size, cases_per_pallet)').eq('jacket_id', jacketId).order('jacket_product_line_id');
    setPurchasedLines(purchased || []);

    // purchased product lines across EVERY jacket — this is what lets you
    // pick which truck to allocate from when several trucks carry the same
    // commodity from different shippers
    const { data: allPurchased } = await supabase.from('jacket_product_lines').select('*, jackets(jacket_number, jacket_status), suppliers(company), products(commodity, pack_size, cases_per_pallet)').order('jacket_product_line_id');
    setAllPurchasedLines((allPurchased || []).filter(p => p.jackets?.jacket_status !== 'Cancelled'));

    // every order line's remaining supply need, regardless of supplier —
    // this is what "Allocate" picks from (Workflow B: orders can exist
    // before any Jacket was purchased)
    const { data: allOL } = await supabase.from('order_lines').select('*, customer_orders(acumatica_order_no, customer_id, customer_location_id, order_status, customers(company)), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)');
    const needList = (allOL || [])
      .filter(ol => ol.customer_orders?.order_status === 'Open')
      .map(ol => {
        const assigned = (allJacketLines || [])
          .filter(jl => jl.order_line_id === ol.order_line_id && jl.jackets?.jacket_status !== 'Cancelled')
          .reduce((s, jl) => s + Number(jl.cases_to_load || 0), 0);
        return { ...ol, needsSupply: Number(ol.cases_ordered || 0) - assigned };
      })
      .filter(ol => ol.needsSupply > 0);
    setAllOrderLinesNeed(needList);
  }

  function openAddPurchased() { setPurchasedForm(BLANK_PURCHASED); setEditingPurchasedId(null); setShowAddPurchased(true); }
  function openEditPurchased(p) {
    setPurchasedForm({ supplier_id: p.supplier_id || '', product_id: p.product_id, shipper_po: p.shipper_po || '', purchased_cases: p.purchased_cases, actual_cases_received: p.actual_cases_received ?? '', purchase_cost_per_case: p.purchase_cost_per_case, fee_total_per_case: p.fee_total_per_case, notes: p.notes || '' });
    setEditingPurchasedId(p.jacket_product_line_id);
    setShowAddPurchased(true);
  }
  async function savePurchased() {
    if (!purchasedForm.product_id || !purchasedForm.purchased_cases) { alert('Product and Purchased Cases are required.'); return; }
    const payload = {
      jacket_id: activeId,
      supplier_id: purchasedForm.supplier_id ? Number(purchasedForm.supplier_id) : null,
      product_id: Number(purchasedForm.product_id),
      shipper_po: purchasedForm.shipper_po || null,
      purchased_cases: Number(purchasedForm.purchased_cases),
      actual_cases_received: purchasedForm.actual_cases_received === '' ? null : Number(purchasedForm.actual_cases_received),
      purchase_cost_per_case: purchasedForm.purchase_cost_per_case ? Number(purchasedForm.purchase_cost_per_case) : 0,
      fee_total_per_case: purchasedForm.fee_total_per_case ? Number(purchasedForm.fee_total_per_case) : 0,
      notes: purchasedForm.notes || null,
      updated_at: new Date().toISOString(),
    };
    if (editingPurchasedId) {
      const { error } = await supabase.from('jacket_product_lines').update(payload).eq('jacket_product_line_id', editingPurchasedId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('jacket_product_lines').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowAddPurchased(false); setEditingPurchasedId(null); setPurchasedForm(BLANK_PURCHASED);
    loadJacketDetail(activeId);
  }
  async function deletePurchased(id) {
    if (!confirm('Remove this purchased product line? Any allocations already made from it will lose their source link (they are not deleted).')) return;
    await supabase.from('jacket_lines').update({ jacket_product_line_id: null }).eq('jacket_product_line_id', id);
    const { error } = await supabase.from('jacket_product_lines').delete().eq('jacket_product_line_id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadJacketDetail(activeId);
  }

  function availableOnPurchased(p) {
    const base = p.actual_cases_received != null ? Number(p.actual_cases_received) : Number(p.purchased_cases);
    const allocated = allJacketLinesGlobal
      .filter(jl => jl.jacket_product_line_id === p.jacket_product_line_id && jl.jackets?.jacket_status !== 'Cancelled')
      .reduce((s, jl) => s + Number(jl.cases_to_load || 0), 0);
    return { base, allocated, available: base - allocated };
  }

  function openAllocate(purchasedLineId) { setAllocateForm({ order_line_id: '', cases: '' }); setAllocatingLineId(purchasedLineId); }
  async function performAllocation(purchased, orderLineId, casesInput) {
    if (!orderLineId || !casesInput) { alert('Pick an order line and enter cases.'); return; }
    const cases = Number(casesInput);
    const { available } = availableOnPurchased(purchased);
    if (cases > available) { alert(`Only ${available} cases available on this purchased line.`); return; }
    const orderLine = allOrderLinesNeed.find(ol => ol.order_line_id === Number(orderLineId));
    if (!orderLine) { alert('Could not find that order line.'); return; }
    if (cases > orderLine.needsSupply) { if (!confirm(`This order only needs ${orderLine.needsSupply} more cases — allocate ${cases} anyway?`)) return; }

    const p = orderLine.products;
    const estPallets = p.cases_per_pallet ? Math.ceil(cases / p.cases_per_pallet) : 0;
    const lineWeight = cases * (p.gross_weight_per_case || 0);
    const allocatedCost = Number(purchased.purchase_cost_per_case || 0) + Number(purchased.fee_total_per_case || 0);

    const { data: jl, error } = await supabase.from('jacket_lines').insert({
      jacket_id: purchased.jacket_id, order_line_id: orderLine.order_line_id, jacket_product_line_id: purchased.jacket_product_line_id,
      allocated_cost_per_case: allocatedCost, planned_cases: cases, cases_to_load: cases,
      actual_cases_loaded: 0, actual_cases_delivered: 0, estimated_pallets: estPallets, line_weight: lineWeight, load_status: 'Planned'
    }).select().single();
    if (error) { alert('Allocation failed: ' + error.message); return; }

    // if the order line has no supplier set yet, derive it from this allocation
    if (!orderLine.supplier_id && purchased.supplier_id) {
      await supabase.from('order_lines').update({ supplier_id: purchased.supplier_id }).eq('order_line_id', orderLine.order_line_id);
    }

    const supplierId = purchased.supplier_id;
    const customerId = orderLine.customer_orders.customer_id;
    const customerLocId = orderLine.customer_orders.customer_location_id || null;
    const pickupStop = await findOrCreateStop(purchased.jacket_id, 'Pickup', supplierId, purchased.supplier_location_id || null, null, null);
    const deliveryStop = await findOrCreateStop(purchased.jacket_id, 'Delivery', null, null, customerId, customerLocId);
    await supabase.from('stop_lines').insert([
      { stop_id: pickupStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
      { stop_id: deliveryStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
    ]);

    loadJacketDetail(activeId);
    return true;
  }

  async function saveAllocate(purchased) {
    const ok = await performAllocation(purchased, allocateForm.order_line_id, allocateForm.cases);
    if (ok) setAllocatingLineId(null);
  }

  async function createOrderFromHere() {
    if (!newOrderForm.customer_id || !newOrderForm.acumatica_no || !newOrderForm.product_id || !newOrderForm.cases) {
      alert('Customer, Acumatica Order #, Product, and Cases are all required.'); return;
    }
    const { data: order, error: orderErr } = await supabase.from('customer_orders').insert({
      acumatica_order_no: newOrderForm.acumatica_no, customer_id: Number(newOrderForm.customer_id),
      customer_po: newOrderForm.customer_po || null, order_date: new Date().toISOString().slice(0, 10),
      order_status: 'Open', source: 'Internal', order_type: 'Produce Sale',
    }).select().single();
    if (orderErr) { alert('Could not create order: ' + orderErr.message); return; }
    const cases = Number(newOrderForm.cases);
    const { error: lineErr } = await supabase.from('order_lines').insert({
      customer_order_id: order.customer_order_id, product_id: Number(newOrderForm.product_id),
      cases_ordered: cases, original_cases_ordered: cases, line_status: 'Open',
    });
    if (lineErr) { alert('Order created, but the line failed: ' + lineErr.message); return; }
    setShowNewOrder(false); setNewOrderForm({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', cases: '' });
    loadJacketDetail(activeId);
  }

  function openDemandAllocate(orderLineId, matchingPurchased) {
    setDemandAllocateForm({ purchased_line_id: matchingPurchased.length === 1 ? matchingPurchased[0].jacket_product_line_id : '', cases: '' });
    setDemandAllocateFor(orderLineId);
  }
  async function saveDemandAllocate(orderLine) {
    const purchased = purchasedLines.find(p => p.jacket_product_line_id === Number(demandAllocateForm.purchased_line_id));
    if (!purchased) { alert('Pick which purchased line to allocate from.'); return; }
    const ok = await performAllocation(purchased, orderLine.order_line_id, demandAllocateForm.cases);
    if (ok) setDemandAllocateFor(null);
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
    // remember which stops this line was on, before we remove it
    const { data: existingStopLines } = await supabase.from('stop_lines').select('stop_id').eq('jacket_line_id', jacketLineId);
    const stopIds = [...new Set((existingStopLines || []).map(r => r.stop_id))];

    const { error: slErr } = await supabase.from('stop_lines').delete().eq('jacket_line_id', jacketLineId);
    if (slErr) { alert('Could not remove: ' + slErr.message); return; }
    const { error: jlErr } = await supabase.from('jacket_lines').delete().eq('jacket_line_id', jacketLineId);
    if (jlErr) { alert('Could not remove: ' + jlErr.message); return; }

    // if a stop now has nothing left on it, remove the stop itself too —
    // otherwise it lingers on the Stops panel forever with nothing in it
    for (const stopId of stopIds) {
      const { data: remaining } = await supabase.from('stop_lines').select('stop_line_id').eq('stop_id', stopId);
      if (!remaining || remaining.length === 0) {
        await supabase.from('stops').delete().eq('stop_id', stopId);
      }
    }

    loadJacketDetail(activeId);
  }

  async function deleteJacket(jacketId, jacketNumber) {
    if (!confirm(`Delete Jacket ${jacketNumber} entirely — its stops, loaded cases, and freight record? Any order lines assigned to it become unassigned again (they are NOT deleted). This cannot be undone.`)) return;
    const { data: jls } = await supabase.from('jacket_lines').select('jacket_line_id').eq('jacket_id', jacketId);
    const jacketLineIds = (jls || []).map(r => r.jacket_line_id);
    if (jacketLineIds.length) {
      await supabase.from('stop_lines').delete().in('jacket_line_id', jacketLineIds);
    }
    await supabase.from('jacket_lines').delete().eq('jacket_id', jacketId);
    await supabase.from('stops').delete().eq('jacket_id', jacketId);
    await supabase.from('jacket_commodity_loads').delete().eq('jacket_id', jacketId);
    await supabase.from('freight_records').delete().eq('jacket_id', jacketId);
    await supabase.from('jacket_extras').delete().eq('jacket_id', jacketId);
    const { error } = await supabase.from('jackets').delete().eq('jacket_id', jacketId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    setActiveId(null);
    loadJackets();
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

  const neededByCommodity = {};
  eligibleLines.forEach(ol => {
    const key = ol.products.commodity + ' — ' + ol.products.pack_size;
    neededByCommodity[key] = (neededByCommodity[key] || 0) + ol.remaining;
  });
  const neededList = Object.entries(neededByCommodity).sort((a, b) => b[1] - a[1]);
  const [showNeeded, setShowNeeded] = useState(true);

  return (
    <AppShell title="InLoads / Jackets">
      <div style={{ ...card, marginBottom: 16 }}>
        <button onClick={() => setShowNeeded(!showNeeded)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: '#2F5233' }}>Cases Still Needed (across all open orders)</strong>
          <span style={{ color: '#78716c', fontSize: 12 }}>{showNeeded ? '▲ hide' : '▼ show'}</span>
        </button>
        {showNeeded && (
          neededList.length === 0 ? <div style={{ color: '#a8a29e', fontSize: 13, marginTop: 8 }}>Everything open is already assigned to a jacket.</div> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginTop: 10 }}>
              {neededList.map(([name, cases]) => (
                <div key={name} style={{ fontSize: 13 }}><strong style={{ color: '#2F5233' }}>{cases}</strong> <span style={{ color: '#78716c' }}>{name}</span></div>
              ))}
            </div>
          )
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select value={activeId || ''} onChange={e => setActiveId(Number(e.target.value))} style={{ padding: '6px 10px', border: '1px solid #DCD5C1', borderRadius: 6, fontSize: 13, fontFamily: 'monospace' }}>
          {jackets.map(j => <option key={j.jacket_id} value={j.jacket_id}>{j.jacket_number}</option>)}
        </select>
        <button onClick={createNewJacket} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: '1px solid #6B8E4E', background: '#fff', color: '#6B8E4E', fontWeight: 600 }}>+ New Jacket</button>
        {activeJacket && (
          <button onClick={() => deleteJacket(activeJacket.jacket_id, activeJacket.jacket_number)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: '1px solid #DCD5C1', background: '#fff', color: '#C0562D' }}>Delete This Jacket</button>
        )}
      </div>

      {activeJacket && (
        <div>
          <div style={{ ...card, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#2F5233' }}>Jacket {activeJacket.jacket_number} — {activeJacket.jacket_status}</strong>
              <span style={{ fontSize: 12, color: '#78716c' }}>{totalWeight.toLocaleString()} lb · {totalPallets} pallets</span>
            </div>
            {editingDetails ? (
              <div style={{ border: '1px solid #DCD5C1', borderRadius: 6, padding: 12 }}>
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
              <button onClick={openEditDetails} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Edit Jacket Details</button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* ---- SUPPLY ---- */}
            <div style={card}>
              <strong style={{ color: '#2F5233' }}>Supply — Purchased Product</strong>
              <div style={{ marginTop: 10 }}>
                {purchasedLines.length === 0 && <div style={{ color: '#a8a29e', fontSize: 13, marginBottom: 8 }}>Nothing purchased on this Jacket yet.</div>}
                {purchasedLines.map(p => {
                  const { allocated, available } = availableOnPurchased(p);
                  return (
                    <div key={p.jacket_product_line_id} style={{ border: '1px solid #DCD5C1', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 13.5 }}>
                          <strong>{p.products?.commodity} — {p.products?.pack_size}</strong> · {p.suppliers?.company || 'no supplier set'} {p.shipper_po ? `· PO ${p.shipper_po}` : ''}
                          <div style={{ fontSize: 12, color: '#78716c', marginTop: 2 }}>
                            Purchased {p.purchased_cases}{p.actual_cases_received != null ? ` · Received ${p.actual_cases_received}` : ''} · Allocated {allocated} · <strong style={{ color: available > 0 ? '#2F5233' : '#C0562D' }}>Available {available}</strong> · ${Number(p.purchase_cost_per_case || 0).toFixed(2)}/cs
                          </div>
                        </div>
                        <div>
                          <button onClick={() => openAllocate(p.jacket_product_line_id)} style={{ ...editBtn, background: '#6B8E4E', color: '#fff', border: 'none' }}>Allocate</button>
                          <button onClick={() => openEditPurchased(p)} style={{ ...editBtn, marginLeft: 6 }}>Edit</button>
                          <button onClick={() => deletePurchased(p.jacket_product_line_id)} style={{ ...editBtn, marginLeft: 6, color: '#C0562D' }}>Delete</button>
                        </div>
                      </div>
                      {allocatingLineId === p.jacket_product_line_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #DCD5C1', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12 }}>Order needing {p.products?.commodity}
                            <select value={allocateForm.order_line_id} onChange={e => setAllocateForm({ ...allocateForm, order_line_id: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 2, minWidth: 220 }}>
                              <option value="">— select —</option>
                              {allOrderLinesNeed.filter(ol => ol.product_id === p.product_id).map(ol => (
                                <option key={ol.order_line_id} value={ol.order_line_id}>{ol.customer_orders?.acumatica_order_no} — {ol.customer_orders?.customers?.company} — needs {ol.needsSupply}</option>
                              ))}
                            </select>
                          </label>
                          <label style={{ fontSize: 12 }}>Cases
                            <input type="number" value={allocateForm.cases} onChange={e => setAllocateForm({ ...allocateForm, cases: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 2, width: 80 }} />
                          </label>
                          <button onClick={() => saveAllocate(p)} style={{ ...editBtn, background: '#6B8E4E', color: '#fff', border: 'none' }}>Confirm</button>
                          <button onClick={() => setAllocatingLineId(null)} style={editBtn}>Cancel</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={openAddPurchased} style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>+ Add Purchased Product</button>
              {showAddPurchased && (
                <div style={{ border: '1px solid #DCD5C1', borderRadius: 6, padding: 12, marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <label style={{ fontSize: 13 }}>Supplier
                    <select value={purchasedForm.supplier_id} onChange={e => setPurchasedForm({ ...purchasedForm, supplier_id: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                      <option value="">— none —</option>
                      {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 13 }}>Product
                    <select value={purchasedForm.product_id} onChange={e => setPurchasedForm({ ...purchasedForm, product_id: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                      <option value="">— select —</option>
                      {products.map(pr => <option key={pr.product_id} value={pr.product_id}>{pr.commodity} — {pr.pack_size}</option>)}
                    </select>
                  </label>
                  {detailField('Shipper PO', 'shipper_po', purchasedForm, setPurchasedForm)}
                  {detailField('Purchased Cases', 'purchased_cases', purchasedForm, setPurchasedForm, 'number')}
                  {detailField('Actual Cases Received', 'actual_cases_received', purchasedForm, setPurchasedForm, 'number')}
                  {detailField('Purchase Cost / cs', 'purchase_cost_per_case', purchasedForm, setPurchasedForm, 'number')}
                  {detailField('Fee Total / cs', 'fee_total_per_case', purchasedForm, setPurchasedForm, 'number')}
                  {detailField('Notes', 'notes', purchasedForm, setPurchasedForm)}
                  <div style={{ gridColumn: 'span 2' }}>
                    <button onClick={savePurchased} style={{ marginRight: 8, padding: '6px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{editingPurchasedId ? 'Update' : 'Save'}</button>
                    <button onClick={() => setShowAddPurchased(false)} style={{ padding: '6px 16px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* ---- DEMAND ---- */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: '#2F5233' }}>Demand — Open Orders Needing This Jacket's Product</strong>
                <button onClick={() => setShowNewOrder(!showNewOrder)} style={{ ...editBtn, background: '#2F5233', color: '#fff', border: 'none' }}>+ New Order</button>
              </div>
              {showNewOrder && (
                <div style={{ border: '1px solid #DCD5C1', borderRadius: 6, padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  <label style={{ fontSize: 13 }}>Customer
                    <select value={newOrderForm.customer_id} onChange={e => setNewOrderForm({ ...newOrderForm, customer_id: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                      <option value="">— select —</option>
                      {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.company}</option>)}
                    </select>
                  </label>
                  {detailField('Acumatica Order #', 'acumatica_no', newOrderForm, setNewOrderForm)}
                  {detailField('Customer PO', 'customer_po', newOrderForm, setNewOrderForm)}
                  <label style={{ fontSize: 13 }}>Product
                    <select value={newOrderForm.product_id} onChange={e => setNewOrderForm({ ...newOrderForm, product_id: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                      <option value="">— select —</option>
                      {products.map(pr => <option key={pr.product_id} value={pr.product_id}>{pr.commodity} — {pr.pack_size}</option>)}
                    </select>
                  </label>
                  {detailField('Cases', 'cases', newOrderForm, setNewOrderForm, 'number')}
                  <div style={{ gridColumn: 'span 2' }}>
                    <button onClick={createOrderFromHere} style={{ marginRight: 8, padding: '6px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save Order</button>
                    <button onClick={() => setShowNewOrder(false)} style={{ padding: '6px 16px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                {(() => {
                  const purchasedProductIds = new Set(purchasedLines.map(p => p.product_id));
                  const matchingDemand = allOrderLinesNeed.filter(ol => purchasedProductIds.has(ol.product_id));
                  if (matchingDemand.length === 0) return <div style={{ color: '#a8a29e', fontSize: 13 }}>No open orders currently need this jacket's commodities.</div>;
                  return matchingDemand.map(ol => {
                    const matchingPurchased = allPurchasedLines.filter(p => p.product_id === ol.product_id && availableOnPurchased(p).available > 0);
                    return (
                      <div key={ol.order_line_id} style={{ border: '1px solid #DCD5C1', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 13.5 }}>
                            <strong>{ol.customer_orders?.customers?.company}</strong> — {ol.customer_orders?.acumatica_order_no}
                            <div style={{ fontSize: 12, color: '#78716c' }}>{ol.products?.commodity} — {ol.products?.pack_size} · needs {ol.needsSupply}</div>
                          </div>
                          <button onClick={() => openDemandAllocate(ol.order_line_id, matchingPurchased)} style={{ ...editBtn, background: '#6B8E4E', color: '#fff', border: 'none' }}>Allocate</button>
                        </div>
                        {demandAllocateFor === ol.order_line_id && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #DCD5C1', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: 12 }}>From which truck
                              <select value={demandAllocateForm.purchased_line_id} onChange={e => setDemandAllocateForm({ ...demandAllocateForm, purchased_line_id: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 2, minWidth: 220 }}>
                                <option value="">— select —</option>
                                {matchingPurchased.map(p => <option key={p.jacket_product_line_id} value={p.jacket_product_line_id}>Jacket {p.jackets?.jacket_number} — {p.suppliers?.company || 'no supplier'} — {availableOnPurchased(p).available} avail</option>)}
                              </select>
                            </label>
                            <label style={{ fontSize: 12 }}>Cases
                              <input type="number" value={demandAllocateForm.cases} onChange={e => setDemandAllocateForm({ ...demandAllocateForm, cases: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 2, width: 80 }} />
                            </label>
                            <button onClick={() => saveDemandAllocate(ol)} style={{ ...editBtn, background: '#6B8E4E', color: '#fff', border: 'none' }}>Confirm</button>
                            <button onClick={() => setDemandAllocateFor(null)} style={editBtn}>Cancel</button>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <strong style={{ color: '#2F5233' }}>Order Allocations</strong>
            {jacketLines.filter(jl => jl.jacket_product_line_id).length === 0 ? (
              <div style={{ color: '#a8a29e', fontSize: 13, marginTop: 8 }}>No allocations from purchased product yet.</div>
            ) : (
              <table style={{ ...table, marginTop: 10 }}>
                <thead><tr style={trHead}><th>Customer</th><th>Order #</th><th>Commodity</th><th>Supplier (allocated from)</th><th style={{ textAlign: 'right' }}>Cases</th><th>Status</th><th></th></tr></thead>
                <tbody>{jacketLines.filter(jl => jl.jacket_product_line_id).map(jl => (
                  <tr key={jl.jacket_line_id} style={tr}>
                    <td>{jl.order_lines?.customer_orders?.customers?.company}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{jl.order_lines?.customer_orders?.acumatica_order_no}</td>
                    <td>{jl.order_lines?.products?.commodity} — {jl.order_lines?.products?.pack_size}</td>
                    <td>{jl.jacket_product_lines?.suppliers?.company || '—'}</td>
                    <td style={{ textAlign: 'right' }}><input type="number" defaultValue={jl.cases_to_load} onBlur={e => updateCases(jl.jacket_line_id, Number(e.target.value), jl.order_lines)} style={{ width: 70 }} /></td>
                    <td>{jl.load_status}</td>
                    <td><button onClick={() => removeLine(jl.jacket_line_id)} style={{ background: 'none', border: 'none', color: '#C0562D', cursor: 'pointer' }}>Remove</button></td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ background: 'none', border: 'none', color: '#78716c', fontSize: 12, cursor: 'pointer', padding: 0 }}>{showAdvanced ? '▲ Hide' : '▼ Show'} Advanced (legacy quick-assign, no purchased-product tracking)</button>
            {showAdvanced && (
              <div style={{ ...card, marginTop: 8 }}>
                <table style={table}>
                  <thead><tr style={trHead}><th>Order Line</th><th>Cases to Load</th><th></th></tr></thead>
                  <tbody>{jacketLines.map(jl => (
                    <tr key={jl.jacket_line_id} style={tr}>
                      <td>{jl.order_lines.customer_orders.acumatica_order_no} | {jl.order_lines.products.commodity} — {jl.order_lines.products.pack_size} | {jl.jacket_product_lines?.suppliers?.company || jl.order_lines.suppliers?.company || 'no supplier'}</td>
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
                        <span>{ol.customer_orders.acumatica_order_no} | {ol.products.commodity} — {ol.products.pack_size} | {ol.suppliers?.company || 'no supplier'}</span>
                        <span style={{ color: '#78716c' }}>{ol.remaining} avail</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
const editBtn = { padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
