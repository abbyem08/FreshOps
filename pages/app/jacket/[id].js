// pages/app/jacket/[id].js
import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../../components/AppShell';
import { supabase } from '../../../lib/supabaseClient';

const BLANK_PURCHASED = { supplier_id: '', product_id: '', shipper_po: '', purchased_cases: '', actual_cases_received: '', purchase_cost_per_case: '', fee_total_per_case: '', notes: '' };
const TABS = ['Overview', 'Products', 'Orders', 'Logistics', 'Financials', 'Documents'];

export default function JacketWorkspace() {
  const router = useRouter();
  const jacketId = router.query.id ? Number(router.query.id) : null;

  const [jacket, setJacket] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [purchasedLines, setPurchasedLines] = useState([]);
  const [allPurchasedLines, setAllPurchasedLines] = useState([]);
  const [allJacketLinesGlobal, setAllJacketLinesGlobal] = useState([]);
  const [jacketLines, setJacketLines] = useState([]);
  const [allOrderLinesNeed, setAllOrderLinesNeed] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stops, setStops] = useState([]);
  const [freight, setFreight] = useState(null);
  const [claims, setClaims] = useState([]);
  const [events, setEvents] = useState([]);
  const [amendments, setAmendments] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [userEmail, setUserEmail] = useState('Staff');

  const [showAddPurchased, setShowAddPurchased] = useState(false);
  const [purchasedForm, setPurchasedForm] = useState(BLANK_PURCHASED);
  const [editingPurchasedId, setEditingPurchasedId] = useState(null);
  const [editingPurchasedOriginal, setEditingPurchasedOriginal] = useState(null);
  const [allocatingLineId, setAllocatingLineId] = useState(null);
  const [allocateForm, setAllocateForm] = useState({ order_line_id: '', cases: '' });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', cases: '' });
  const [demandAllocateFor, setDemandAllocateFor] = useState(null);
  const [demandAllocateForm, setDemandAllocateForm] = useState({ purchased_line_id: '', cases: '' });
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({});
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({ document_type: '', file_name: '', url: '', notes: '' });
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({});
  const [carriers, setCarriers] = useState([]);
  const [editingFreight, setEditingFreight] = useState(false);
  const [freightForm, setFreightForm] = useState({});
  const [commodityLoads, setCommodityLoads] = useState([]);
  const [notificationsByLine, setNotificationsByLine] = useState({});
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ jacket_line_id: '', claim_type: 'Quality', description: '' });
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: 'Resolved', resolution: '', price_adjustment: '', jacket_line_id: '' });
  const [amendingOrderedLineId, setAmendingOrderedLineId] = useState(null);
  const [amendOrderedValue, setAmendOrderedValue] = useState('');
  const [reassigningLineId, setReassigningLineId] = useState(null);
  const [reassignOptions, setReassignOptions] = useState([]);
  const [reassignTarget, setReassignTarget] = useState('');
  const [movingClaimId, setMovingClaimId] = useState(null);
  const [moveCasesForm, setMoveCasesForm] = useState({ target_order_line_id: '', cases: '' });
  const [moveCasesOptions, setMoveCasesOptions] = useState([]);
  const [compensatingClaimId, setCompensatingClaimId] = useState(null);
  const [compensationForm, setCompensationForm] = useState({ cases: '', notes: '' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data?.user?.email) setUserEmail(data.user.email); });
  }, []);
  useEffect(() => { if (jacketId) loadAll(); }, [jacketId]);

  async function logEvent(event_type, description, original_value = null, adjustment = null, new_value = null) {
    await supabase.from('jacket_events').insert({ jacket_id: jacketId, event_type, description, original_value, adjustment, new_value, created_by: userEmail });
  }

  async function loadAll() {
    const { data: j } = await supabase.from('jackets').select('*').eq('jacket_id', jacketId).single();
    setJacket(j);

    const { data: s } = await supabase.from('suppliers').select('supplier_id, company').order('company');
    setSuppliers(s || []);
    const { data: p } = await supabase.from('products').select('product_id, commodity, pack_size, cases_per_pallet, gross_weight_per_case').order('commodity');
    setProducts(p || []);
    const { data: c } = await supabase.from('customers').select('customer_id, company').order('company');
    setCustomers(c || []);

    const { data: lines } = await supabase
      .from('jacket_lines')
      .select('*, order_lines(*, customer_orders(acumatica_order_no, customer_id, customers(company)), suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)), jacket_product_lines(suppliers(company))')
      .eq('jacket_id', jacketId);
    setJacketLines(lines || []);

    const { data: allJacketLines } = await supabase.from('jacket_lines').select('order_line_id, cases_to_load, jacket_product_line_id, jackets(jacket_status)');
    setAllJacketLinesGlobal(allJacketLines || []);

    const { data: purchased } = await supabase.from('jacket_product_lines').select('*, suppliers(company), products(commodity, pack_size, cases_per_pallet)').eq('jacket_id', jacketId).order('jacket_product_line_id');
    setPurchasedLines(purchased || []);
    const { data: allPurchased } = await supabase.from('jacket_product_lines').select('*, jackets(jacket_number, jacket_status), suppliers(company), products(commodity, pack_size, cases_per_pallet)').order('jacket_product_line_id');
    setAllPurchasedLines((allPurchased || []).filter(x => x.jackets?.jacket_status !== 'Cancelled'));

    const { data: allOL } = await supabase.from('order_lines').select('*, customer_orders(acumatica_order_no, customer_id, customer_location_id, order_status, customers(company)), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)');
    const needList = (allOL || [])
      .filter(ol => ol.customer_orders?.order_status === 'Open')
      .map(ol => {
        const assigned = (allJacketLines || []).filter(jl => jl.order_line_id === ol.order_line_id && jl.jackets?.jacket_status !== 'Cancelled').reduce((s2, jl) => s2 + Number(jl.cases_to_load || 0), 0);
        return { ...ol, needsSupply: Number(ol.cases_ordered || 0) - assigned };
      })
      .filter(ol => ol.needsSupply > 0);
    setAllOrderLinesNeed(needList);

    const { data: carrierRows } = await supabase.from('carriers').select('carrier_id, name').order('name');
    setCarriers(carrierRows || []);

    const { data: stopRows } = await supabase
      .from('stops')
      .select('*, suppliers(company, pickup_address, city, state, phone), customers(company, delivery_address, city, state, phone), supplier_locations(label, address, city, state, phone, contact), customer_locations(label, address, city, state, phone, contact), stop_lines(*, jacket_lines(*, order_lines(shipper_po, products(commodity, pack_size)), customer_notifications(notification_type, notified_at)))')
      .eq('jacket_id', jacketId)
      .order('stop_number');
    setStops(stopRows || []);
    const { data: fr } = await supabase.from('freight_records').select('*').eq('jacket_id', jacketId).order('quote_date', { ascending: false }).limit(1).maybeSingle();
    setFreight(fr || null);

    const { data: cLoads } = await supabase.from('jacket_commodity_loads').select('*').eq('jacket_id', jacketId);
    setCommodityLoads(cLoads || []);
    const lineIds = (lines || []).map(l => l.jacket_line_id);
    if (lineIds.length) {
      const { data: notifs } = await supabase.from('customer_notifications').select('*').in('jacket_line_id', lineIds).order('notified_at', { ascending: true });
      const grouped = {};
      (notifs || []).forEach(n => { grouped[n.jacket_line_id] = grouped[n.jacket_line_id] || []; grouped[n.jacket_line_id].push(n); });
      setNotificationsByLine(grouped);
    } else {
      setNotificationsByLine({});
    }

    const { data: cl } = await supabase
      .from('claims')
      .select('*, jacket_lines(jacket_id, order_line_id, order_lines(order_line_id, sell_price_per_case, products(commodity, pack_size), customer_orders(acumatica_order_no, customers(company))))')
      .order('date_opened', { ascending: false });
    setClaims((cl || []).filter(c => c.jacket_lines?.jacket_id === jacketId));

    const { data: ev } = await supabase.from('jacket_events').select('*').eq('jacket_id', jacketId).order('created_at', { ascending: false });
    setEvents(ev || []);
    const { data: am } = await supabase.from('amendments').select('*').eq('jacket_id', jacketId).order('created_at', { ascending: false });
    setAmendments(am || []);
    const { data: docs } = await supabase.from('jacket_documents').select('*').eq('jacket_id', jacketId).order('created_at', { ascending: false });
    setDocuments(docs || []);
  }

  function availableOnPurchased(p) {
    const base = p.actual_cases_received != null ? Number(p.actual_cases_received) : Number(p.purchased_cases);
    const allocated = allJacketLinesGlobal.filter(jl => jl.jacket_product_line_id === p.jacket_product_line_id && jl.jackets?.jacket_status !== 'Cancelled').reduce((s, jl) => s + Number(jl.cases_to_load || 0), 0);
    return { base, allocated, available: base - allocated };
  }

  async function findOrCreateStop(type, supplierId, supplierLocId, customerId, customerLocId) {
    let query = supabase.from('stops').select('*').eq('jacket_id', jacketId).eq('stop_type', type);
    query = type === 'Pickup'
      ? (supplierLocId ? query.eq('supplier_id', supplierId).eq('supplier_location_id', supplierLocId) : query.eq('supplier_id', supplierId).is('supplier_location_id', null))
      : (customerLocId ? query.eq('customer_id', customerId).eq('customer_location_id', customerLocId) : query.eq('customer_id', customerId).is('customer_location_id', null));
    const { data: existing } = await query.maybeSingle();
    if (existing) return existing;
    const { data: existingStops } = await supabase.from('stops').select('stop_id').eq('jacket_id', jacketId);
    const nextNum = (existingStops?.length || 0) + 1;
    const { data: created } = await supabase.from('stops').insert({ jacket_id: jacketId, stop_number: nextNum, stop_type: type, supplier_id: supplierId, supplier_location_id: supplierLocId, customer_id: customerId, customer_location_id: customerLocId, status: 'Planned' }).select().single();
    return created;
  }

  // ---- Products (Supply) ----
  function openAddPurchased() { setPurchasedForm(BLANK_PURCHASED); setEditingPurchasedId(null); setShowAddPurchased(true); }
  function openEditPurchased(p) {
    setPurchasedForm({ supplier_id: p.supplier_id || '', product_id: p.product_id, shipper_po: p.shipper_po || '', purchased_cases: p.purchased_cases, actual_cases_received: p.actual_cases_received ?? '', purchase_cost_per_case: p.purchase_cost_per_case, fee_total_per_case: p.fee_total_per_case, notes: p.notes || '' });
    setEditingPurchasedId(p.jacket_product_line_id);
    setEditingPurchasedOriginal(p);
    setShowAddPurchased(true);
  }
  async function savePurchased() {
    if (!purchasedForm.product_id || !purchasedForm.purchased_cases) { alert('Product and Purchased Cases are required.'); return; }
    const payload = {
      jacket_id: jacketId, supplier_id: purchasedForm.supplier_id ? Number(purchasedForm.supplier_id) : null, product_id: Number(purchasedForm.product_id),
      shipper_po: purchasedForm.shipper_po || null, purchased_cases: Number(purchasedForm.purchased_cases),
      actual_cases_received: purchasedForm.actual_cases_received === '' ? null : Number(purchasedForm.actual_cases_received),
      purchase_cost_per_case: purchasedForm.purchase_cost_per_case ? Number(purchasedForm.purchase_cost_per_case) : 0,
      fee_total_per_case: purchasedForm.fee_total_per_case ? Number(purchasedForm.fee_total_per_case) : 0,
      notes: purchasedForm.notes || null, updated_at: new Date().toISOString(),
    };
    const productLabel = products.find(pr => pr.product_id === Number(purchasedForm.product_id));
    if (editingPurchasedId) {
      const { error } = await supabase.from('jacket_product_lines').update(payload).eq('jacket_product_line_id', editingPurchasedId);
      if (error) { alert('Save failed: ' + error.message); return; }
      // keep already-allocated lines' cost in sync with the edited purchase
      // cost/fee, so Financials reflects your latest numbers rather than a
      // frozen snapshot from whenever the allocation was first made
      const newAllocatedCost = payload.purchase_cost_per_case + payload.fee_total_per_case;
      await supabase.from('jacket_lines').update({ allocated_cost_per_case: newAllocatedCost }).eq('jacket_product_line_id', editingPurchasedId);
      const o = editingPurchasedOriginal || {};
      await logAmendments(`${productLabel?.commodity || 'Product'} amended`, 'Cost Change', [
        { field: 'purchased_cases', before: Number(o.purchased_cases ?? 0), after: payload.purchased_cases },
        { field: 'actual_cases_received', before: o.actual_cases_received != null ? Number(o.actual_cases_received) : null, after: payload.actual_cases_received },
        { field: 'purchase_cost_per_case', before: Number(o.purchase_cost_per_case ?? 0), after: payload.purchase_cost_per_case },
        { field: 'fee_total_per_case', before: Number(o.fee_total_per_case ?? 0), after: payload.fee_total_per_case },
        { field: 'shipper_po', before: o.shipper_po || '', after: payload.shipper_po || '' },
      ], { jacket_product_line_id: editingPurchasedId });
      await logEvent('product_amended', `Purchased product amended — ${productLabel?.commodity}`, null, null, `${payload.purchased_cases} cases @ $${payload.purchase_cost_per_case}/cs`);
    } else {
      const { error } = await supabase.from('jacket_product_lines').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
      await logEvent('product_added', `Purchased ${payload.purchased_cases} cases of ${productLabel?.commodity} from ${suppliers.find(x => x.supplier_id === payload.supplier_id)?.company || 'no supplier'}`);
    }
    setShowAddPurchased(false); setEditingPurchasedId(null); setEditingPurchasedOriginal(null); setPurchasedForm(BLANK_PURCHASED);
    loadAll();
  }
  async function deletePurchased(id) {
    if (!confirm('Remove this purchased product line? Any allocations already made from it will lose their source link (they are not deleted).')) return;
    await supabase.from('jacket_lines').update({ jacket_product_line_id: null }).eq('jacket_product_line_id', id);
    const { error } = await supabase.from('jacket_product_lines').delete().eq('jacket_product_line_id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }

  function openAllocate(purchasedLineId) { setAllocateForm({ order_line_id: '', cases: '' }); setAllocatingLineId(purchasedLineId); }
  async function performAllocation(purchased, orderLineId, casesInput) {
    if (!orderLineId || !casesInput) { alert('Pick an order line and enter cases.'); return false; }
    const cases = Number(casesInput);
    const { available } = availableOnPurchased(purchased);
    if (cases > available) { alert(`Only ${available} cases available on this purchased line.`); return false; }
    const orderLine = allOrderLinesNeed.find(ol => ol.order_line_id === Number(orderLineId));
    if (!orderLine) { alert('Could not find that order line.'); return false; }
    if (cases > orderLine.needsSupply) { if (!confirm(`This order only needs ${orderLine.needsSupply} more cases — allocate ${cases} anyway?`)) return false; }

    const p = orderLine.products;
    const estPallets = p.cases_per_pallet ? Math.ceil(cases / p.cases_per_pallet) : 0;
    const lineWeight = cases * (p.gross_weight_per_case || 0);
    const allocatedCost = Number(purchased.purchase_cost_per_case || 0) + Number(purchased.fee_total_per_case || 0);

    const { data: jl, error } = await supabase.from('jacket_lines').insert({
      jacket_id: purchased.jacket_id, order_line_id: orderLine.order_line_id, jacket_product_line_id: purchased.jacket_product_line_id,
      allocated_cost_per_case: allocatedCost, planned_cases: cases, cases_to_load: cases,
      actual_cases_loaded: 0, actual_cases_delivered: 0, estimated_pallets: estPallets, line_weight: lineWeight, load_status: 'Planned'
    }).select().single();
    if (error) { alert('Allocation failed: ' + error.message); return false; }

    if (!orderLine.supplier_id && purchased.supplier_id) {
      await supabase.from('order_lines').update({ supplier_id: purchased.supplier_id }).eq('order_line_id', orderLine.order_line_id);
    }
    const pickupStop = await findOrCreateStop('Pickup', purchased.supplier_id, purchased.supplier_location_id || null, null, null);
    const deliveryStop = await findOrCreateStop('Delivery', null, null, orderLine.customer_orders.customer_id, orderLine.customer_orders.customer_location_id || null);
    await supabase.from('stop_lines').insert([
      { stop_id: pickupStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
      { stop_id: deliveryStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
    ]);
    await logEvent('order_allocated', `Allocated ${cases} cases of ${p.commodity} to ${orderLine.customer_orders?.customers?.company} (${orderLine.customer_orders?.acumatica_order_no || 'no Acumatica #'})`);
    return true;
  }
  async function saveAllocate(purchased) {
    const ok = await performAllocation(purchased, allocateForm.order_line_id, allocateForm.cases);
    if (ok) { setAllocatingLineId(null); loadAll(); }
  }
  function openDemandAllocate(orderLineId, matchingPurchased) {
    setDemandAllocateForm({ purchased_line_id: matchingPurchased.length === 1 ? matchingPurchased[0].jacket_product_line_id : '', cases: '' });
    setDemandAllocateFor(orderLineId);
  }
  async function saveDemandAllocate(orderLine) {
    const purchased = allPurchasedLines.find(p => p.jacket_product_line_id === Number(demandAllocateForm.purchased_line_id));
    if (!purchased) { alert('Pick which purchased line to allocate from.'); return; }
    const ok = await performAllocation(purchased, orderLine.order_line_id, demandAllocateForm.cases);
    if (ok) { setDemandAllocateFor(null); loadAll(); }
  }

  // ---- Orders: new order from here ----
  async function createOrderFromHere() {
    if (!newOrderForm.customer_id || !newOrderForm.product_id || !newOrderForm.cases) { alert('Customer, Product, and Cases are all required.'); return; }
    const { data: order, error: orderErr } = await supabase.from('customer_orders').insert({
      acumatica_order_no: newOrderForm.acumatica_no || null, customer_id: Number(newOrderForm.customer_id),
      customer_po: newOrderForm.customer_po || null, order_date: new Date().toISOString().slice(0, 10),
      order_status: 'Open', source: 'Internal', order_type: 'Produce Sale',
    }).select().single();
    if (orderErr) { alert('Could not create order: ' + orderErr.message); return; }
    const cases = Number(newOrderForm.cases);
    const { error: lineErr } = await supabase.from('order_lines').insert({ customer_order_id: order.customer_order_id, product_id: Number(newOrderForm.product_id), cases_ordered: cases, original_cases_ordered: cases, line_status: 'Open' });
    if (lineErr) { alert('Order created, but the line failed: ' + lineErr.message); return; }
    await logEvent('order_created', `New order created for ${customers.find(c => c.customer_id === Number(newOrderForm.customer_id))?.company} — ${cases} cases`);
    setShowNewOrder(false); setNewOrderForm({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', cases: '' });
    loadAll();
  }

  // ---- Header actions ----
  function openEditDetails() {
    setDetailsForm({ jacket_number: jacket.jacket_number, jacket_date: jacket.jacket_date || '', carrier: jacket.carrier || '', driver: jacket.driver || '', driver_phone: jacket.driver_phone || '', truck: jacket.truck || '', trailer: jacket.trailer || '', route: jacket.route || '', jacket_status: jacket.jacket_status, weight_capacity: jacket.weight_capacity || '', pallet_capacity: jacket.pallet_capacity || '' });
    setEditingDetails(true);
  }
  async function updateJacketDetails() {
    const payload = { ...detailsForm, weight_capacity: detailsForm.weight_capacity ? Number(detailsForm.weight_capacity) : null, pallet_capacity: detailsForm.pallet_capacity ? Number(detailsForm.pallet_capacity) : null };
    const { error } = await supabase.from('jackets').update(payload).eq('jacket_id', jacketId);
    if (error) { alert('Save failed: ' + error.message); return; }
    await logAmendments('Jacket details amended', 'Other', [
      { field: 'carrier', before: jacket.carrier || '', after: payload.carrier || '' },
      { field: 'driver', before: jacket.driver || '', after: payload.driver || '' },
      { field: 'jacket_status', before: jacket.jacket_status || '', after: payload.jacket_status || '' },
      { field: 'truck', before: jacket.truck || '', after: payload.truck || '' },
      { field: 'trailer', before: jacket.trailer || '', after: payload.trailer || '' },
    ]);
    await logEvent('details_edited', `Jacket details updated (status: ${payload.jacket_status})`);
    setEditingDetails(false);
    loadAll();
  }
  // Generic amendment logger — called automatically from every save
  // function below, right after a real edit succeeds. Compares each
  // before/after pair and only writes a row for fields that actually
  // changed. No separate "amendment area" — amending IS editing.
  async function logAmendments(amendmentName, amendmentType, diffs, contextIds = {}) {
    const rows = diffs
      .filter(d => String(d.before ?? '') !== String(d.after ?? ''))
      .map(d => {
        const numeric = typeof d.before === 'number' && typeof d.after === 'number';
        return {
          jacket_id: jacketId, ...contextIds,
          amendment_name: amendmentName, amendment_type: amendmentType, target_field: d.field,
          original_value: d.before != null && d.before !== '' ? String(d.before) : null,
          new_effective_value: d.after != null && d.after !== '' ? String(d.after) : null,
          adjustment_value: numeric ? (d.after - d.before >= 0 ? '+' : '') + (d.after - d.before) : null,
          created_by: userEmail, status: 'Active',
        };
      });
    if (rows.length) await supabase.from('amendments').insert(rows);
  }
  async function reverseAmendment(a) {
    if (!confirm(`Reverse "${a.amendment_name}"? This creates a new amendment that undoes it — the original stays on record, nothing gets deleted.`)) return;
    const { data: reversal, error } = await supabase.from('amendments').insert({
      jacket_id: jacketId, amendment_name: `Reversal — ${a.amendment_name}`, amendment_type: a.amendment_type, target_field: a.target_field,
      original_value: a.new_effective_value, adjustment_value: a.adjustment_value, new_effective_value: a.original_value,
      reason: `Reversing amendment #${a.amendment_id}`, created_by: userEmail, status: 'Active',
    }).select().single();
    if (error) { alert('Reversal failed: ' + error.message); return; }
    await supabase.from('amendments').update({ status: 'Reversed', reversed_by_amendment_id: reversal.amendment_id }).eq('amendment_id', a.amendment_id);
    await logEvent('amendment_reversed', `Reversed — ${a.amendment_name}`, a.new_effective_value, null, a.original_value);
    loadAll();
  }
  async function closeJacket() {
    const openIssues = [];
    if (claims.length > 0) openIssues.push(`${claims.length} open claim(s)`);
    const stillAvailable = purchasedLines.reduce((s, p) => s + availableOnPurchased(p).available, 0);
    if (stillAvailable > 0) openIssues.push(`${stillAvailable} cases still available/unsold`);
    if (purchasedLines.length > 0 && !freight) openIssues.push('no freight record');
    const msg = openIssues.length
      ? `This Jacket still has open items: ${openIssues.join(', ')}. Close anyway?`
      : 'Close this Jacket?';
    if (!confirm(msg)) return;
    const { error } = await supabase.from('jackets').update({ jacket_status: 'Closed' }).eq('jacket_id', jacketId);
    if (error) { alert('Failed: ' + error.message); return; }
    await logEvent('closed', 'Jacket closed' + (openIssues.length ? ` with open items: ${openIssues.join(', ')}` : ''));
    alert('Jacket closed. It won\'t show under the "Active" filter on the Jackets list anymore — switch to "Closed" or "All" to find it.');
    loadAll();
  }

  async function deleteJacketEntirely() {
    if (!confirm(`Permanently delete Jacket ${jacket.jacket_number}? This removes everything on it — purchased product, allocations, stops, freight, claims, and its Timeline. This cannot be undone.`)) return;
    if (!confirm('Really sure? Type OK to confirm one more time — this is permanent.')) return;
    const { data: jl } = await supabase.from('jacket_lines').select('jacket_line_id').eq('jacket_id', jacketId);
    const jlIds = (jl || []).map(x => x.jacket_line_id);
    if (jlIds.length) await supabase.from('stop_lines').delete().in('jacket_line_id', jlIds);
    const { data: stopRows } = await supabase.from('stops').select('stop_id').eq('jacket_id', jacketId);
    const stopIds = (stopRows || []).map(x => x.stop_id);
    if (stopIds.length) await supabase.from('stop_lines').delete().in('stop_id', stopIds);
    await supabase.from('stops').delete().eq('jacket_id', jacketId);
    await supabase.from('jacket_lines').delete().eq('jacket_id', jacketId);
    await supabase.from('jacket_product_lines').delete().eq('jacket_id', jacketId);
    await supabase.from('freight_records').delete().eq('jacket_id', jacketId);
    await supabase.from('claims').delete().in('jacket_line_id', jlIds.length ? jlIds : [-1]);
    await supabase.from('jacket_documents').delete().eq('jacket_id', jacketId);
    await supabase.from('jacket_events').delete().eq('jacket_id', jacketId);
    const { error } = await supabase.from('jackets').delete().eq('jacket_id', jacketId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    router.push('/app/jackets');
  }

  function openEditPayment() {
    setPaymentForm({
      supplier_payment_status: jacket.supplier_payment_status || 'Unpaid',
      supplier_amount_paid: jacket.supplier_amount_paid || '',
      supplier_payment_arrangement: jacket.supplier_payment_arrangement || '',
      supplier_payment_due_date: jacket.supplier_payment_due_date || '',
      supplier_payment_notes: jacket.supplier_payment_notes || '',
    });
    setEditingPayment(true);
  }
  async function saveSupplierPayment() {
    const payload = { ...paymentForm, supplier_amount_paid: paymentForm.supplier_amount_paid ? Number(paymentForm.supplier_amount_paid) : 0 };
    const { error } = await supabase.from('jackets').update(payload).eq('jacket_id', jacketId);
    if (error) { alert('Save failed: ' + error.message); return; }
    await logAmendments('Supplier payment amended', 'Credit', [
      { field: 'supplier_payment_status', before: jacket.supplier_payment_status || 'Unpaid', after: payload.supplier_payment_status },
      { field: 'supplier_amount_paid', before: jacket.supplier_amount_paid != null ? Number(jacket.supplier_amount_paid) : 0, after: payload.supplier_amount_paid },
    ]);
    await logEvent('supplier_payment_updated', `Supplier payment updated — ${payload.supplier_payment_status}${payload.supplier_amount_paid ? `, $${payload.supplier_amount_paid.toLocaleString()} paid` : ''}`, jacket.supplier_payment_status, null, payload.supplier_payment_status);
    setEditingPayment(false);
    loadAll();
  }

  // ---- Documents ----
  async function saveDocument() {
    if (!docForm.file_name) { alert('Give the document a name.'); return; }
    const { error } = await supabase.from('jacket_documents').insert({ jacket_id: jacketId, ...docForm, uploaded_by: userEmail });
    if (error) { alert('Save failed: ' + error.message); return; }
    await logEvent('document_added', `Document added: ${docForm.file_name}`);
    setShowAddDoc(false); setDocForm({ document_type: '', file_name: '', url: '', notes: '' });
    loadAll();
  }
  async function deleteDocument(id) {
    if (!confirm('Remove this document reference?')) return;
    await supabase.from('jacket_documents').delete().eq('document_id', id);
    loadAll();
  }

  // ---- Freight ----
  function toLocalInputValue(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function openFreightEdit() {
    setFreightForm(freight || { carrier: jacket?.carrier || '', trip_type: 'One Pick/One Drop', quoted_rate: '', booked_rate: '', extra_fees: '', extra_fees_notes: '', miles: '', status: 'Quoted', carrier_invoice_number: '', invoice_received: false, carrier_paid: false });
    setEditingFreight(true);
  }
  async function saveFreight() {
    if (!freightForm.carrier) { alert('Carrier is required.'); return; }
    const payload = {
      jacket_id: jacketId, carrier: freightForm.carrier, trip_type: freightForm.trip_type,
      quoted_rate: freightForm.quoted_rate ? Number(freightForm.quoted_rate) : null,
      booked_rate: freightForm.booked_rate ? Number(freightForm.booked_rate) : null,
      extra_fees: freightForm.extra_fees ? Number(freightForm.extra_fees) : 0,
      extra_fees_notes: freightForm.extra_fees_notes || null,
      miles: freightForm.miles ? Number(freightForm.miles) : null,
      status: freightForm.status, carrier_invoice_number: freightForm.carrier_invoice_number || null,
      invoice_received: !!freightForm.invoice_received, carrier_paid: !!freightForm.carrier_paid,
    };
    if (freight) {
      const { error } = await supabase.from('freight_records').update(payload).eq('freight_id', freight.freight_id);
      if (error) { alert('Save failed: ' + error.message); return; }
      await logAmendments('Freight amended', 'Freight Change', [
        { field: 'carrier', before: freight.carrier || '', after: payload.carrier },
        { field: 'booked_rate', before: freight.booked_rate != null ? Number(freight.booked_rate) : null, after: payload.booked_rate },
        { field: 'extra_fees', before: freight.extra_fees != null ? Number(freight.extra_fees) : 0, after: payload.extra_fees },
        { field: 'status', before: freight.status || '', after: payload.status },
      ], { freight_record_id: freight.freight_id });
    } else {
      const { error } = await supabase.from('freight_records').insert({ ...payload, quote_date: new Date().toISOString().slice(0, 10) });
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    await logEvent('freight_updated', `Freight ${freight ? 'updated' : 'booked'} — ${payload.carrier}, ${payload.status}`);
    setEditingFreight(false);
    loadAll();
  }

  // ---- Stops ----
  async function updateStopNumber(stopId, newNumber) {
    const old = stops.find(s => s.stop_id === stopId);
    const { error } = await supabase.from('stops').update({ stop_number: Number(newNumber) }).eq('stop_id', stopId);
    if (error) { alert('Update failed: ' + error.message); return; }
    await logAmendments('Stop number changed', 'Stop Change', [{ field: 'stop_number', before: old?.stop_number ?? null, after: Number(newNumber) }]);
    loadAll();
  }
  async function updateAppointment(stopId, value) {
    const old = stops.find(s => s.stop_id === stopId);
    const newVal = value ? new Date(value).toISOString() : null;
    const { error } = await supabase.from('stops').update({ appointment: newVal }).eq('stop_id', stopId);
    if (error) { alert('Update failed: ' + error.message); return; }
    await logAmendments('Appointment changed', 'Delivery Date Change', [{ field: 'appointment', before: old?.appointment || null, after: newVal }]);
    loadAll();
  }

  // ---- Load Tracking: jacket-level actual loaded, by commodity/shipper ----
  async function updateCommodityLoad(productId, supplierId, value) {
    const existing = commodityLoads.find(c => c.product_id === productId && c.supplier_id === supplierId);
    let error;
    if (existing) {
      ({ error } = await supabase.from('jacket_commodity_loads').update({ actual_cases_loaded: value }).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('jacket_commodity_loads').insert({ jacket_id: jacketId, product_id: productId, supplier_id: supplierId, actual_cases_loaded: value }));
    }
    if (error) { alert('Update failed: ' + error.message); return; }
    await logAmendments('Actual cases loaded changed', 'Quantity Increase', [{ field: 'actual_cases_loaded', before: existing?.actual_cases_loaded != null ? Number(existing.actual_cases_loaded) : null, after: value }]);
    loadAll();
  }
  async function updateJacketLineField(id, fieldName, value) {
    const old = jacketLines.find(l => l.jacket_line_id === id);
    const { error } = await supabase.from('jacket_lines').update({ [fieldName]: value, updated_at: new Date().toISOString() }).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    const typeMap = { load_status: 'Stop Change', bol_number: 'Note' };
    await logAmendments(`${fieldName === 'bol_number' ? 'BOL #' : 'Load status'} changed`, typeMap[fieldName] || 'Other', [{ field: fieldName, before: old?.[fieldName] ?? null, after: value }], { order_line_id: old?.order_line_id || null });
    loadAll();
  }
  function openAmendOrdered(line) { setAmendingOrderedLineId(line.jacket_line_id); setAmendOrderedValue(line.order_lines?.cases_ordered ?? ''); }
  async function saveAmendOrdered(line) {
    const originalCases = Number(line.order_lines?.cases_ordered ?? 0);
    const newCases = Number(amendOrderedValue);
    const diff = newCases - originalCases;
    const { error } = await supabase.from('order_lines').update({ cases_ordered: newCases, amended_at: new Date().toISOString() }).eq('order_line_id', line.order_line_id);
    if (error) { alert('Amend failed: ' + error.message); return; }
    await supabase.from('amendments').insert({
      jacket_id: jacketId, order_line_id: line.order_line_id, amendment_name: 'Quantity Amendment', amendment_type: diff >= 0 ? 'Quantity Increase' : 'Quantity Decrease',
      target_field: 'cases_ordered', original_value: String(originalCases), adjustment_value: (diff >= 0 ? '+' : '') + diff, new_effective_value: String(newCases),
      created_by: userEmail, status: 'Active',
    });
    await logEvent('order_amended', `${line.order_lines?.products?.commodity} — cases ordered ${originalCases} → ${newCases}`, String(originalCases), (diff >= 0 ? '+' : '') + diff, String(newCases));
    setAmendingOrderedLineId(null);
    loadAll();
  }
  async function logNotification(jacketLineId, type) {
    const { error } = await supabase.from('customer_notifications').insert({ jacket_line_id: jacketLineId, notification_type: type });
    if (error) { alert('Could not log: ' + error.message); return; }
    loadAll();
  }
  async function removeNotification(id) {
    const { error } = await supabase.from('customer_notifications').delete().eq('notification_id', id);
    if (error) { alert('Could not remove: ' + error.message); return; }
    loadAll();
  }
  async function updateDelivered(id, value) {
    const old = jacketLines.find(l => l.jacket_line_id === id);
    const { error } = await supabase.from('jacket_lines').update({ actual_cases_delivered: value, quantity_updated_at: new Date().toISOString() }).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    await logAmendments('Delivered quantity changed', old && Number(value) >= Number(old.actual_cases_delivered || 0) ? 'Overage' : 'Shortage', [{ field: 'actual_cases_delivered', before: old?.actual_cases_delivered != null ? Number(old.actual_cases_delivered) : 0, after: Number(value) }], { order_line_id: old?.order_line_id || null });
    loadAll();
  }
  async function openReassignLine(line) {
    const { data } = await supabase
      .from('order_lines').select('order_line_id, cases_ordered, customer_orders(acumatica_order_no, order_status, customers(company))')
      .eq('product_id', line.order_lines?.product_id).neq('order_line_id', line.order_line_id);
    setReassignOptions((data || []).filter(ol => ol.customer_orders?.order_status === 'Open'));
    setReassignTarget('');
    setReassigningLineId(line.jacket_line_id);
  }
  async function saveReassignLine(line) {
    if (!reassignTarget) { alert('Pick which order to move this to.'); return; }
    const newOrder = reassignOptions.find(ol => ol.order_line_id === Number(reassignTarget));
    const { error } = await supabase.from('jacket_lines').update({ order_line_id: Number(reassignTarget), quantity_updated_at: new Date().toISOString() }).eq('jacket_line_id', line.jacket_line_id);
    if (error) { alert('Reassign failed: ' + error.message); return; }
    await logAmendments('Reassigned to a different order', 'Customer Change', [{ field: 'order_line_id', before: line.order_lines?.customer_orders?.acumatica_order_no || `line ${line.order_line_id}`, after: newOrder?.customer_orders?.acumatica_order_no || `line ${reassignTarget}` }], { order_line_id: Number(reassignTarget) });
    setReassigningLineId(null);
    loadAll();
  }

  // ---- Claims ----
  async function saveClaim() {
    if (!claimForm.jacket_line_id || !claimForm.description) { alert('Pick a jacket line and describe the issue.'); return; }
    const line = jacketLines.find(l => l.jacket_line_id === Number(claimForm.jacket_line_id));
    const { error } = await supabase.from('claims').insert({
      jacket_line_id: Number(claimForm.jacket_line_id), claim_type: claimForm.claim_type, description: claimForm.description, status: 'Open',
      snapshot_jacket_number: jacket.jacket_number, snapshot_order_no: line?.order_lines?.customer_orders?.acumatica_order_no || null,
      snapshot_customer: line?.order_lines?.customer_orders?.customers?.company || null, snapshot_commodity: line?.order_lines?.products?.commodity || null,
    });
    if (error) { alert('Save failed: ' + error.message); return; }
    await logEvent('claim_opened', `Claim opened — ${claimForm.claim_type}: ${claimForm.description}`);
    setClaimForm({ jacket_line_id: '', claim_type: 'Quality', description: '' });
    setShowClaimForm(false);
    loadAll();
  }
  function openResolve(claim) {
    setResolveForm({ status: claim.status === 'Open' ? 'Resolved' : claim.status, resolution: claim.resolution || '', price_adjustment: claim.resolution_price_adjustment || '', jacket_line_id: claim.jacket_line_id || '' });
    setResolvingId(claim.claim_id);
  }
  async function deleteClaim(claimId) {
    if (!confirm('Delete this claim? This cannot be undone.')) return;
    const { error } = await supabase.from('claims').delete().eq('claim_id', claimId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }
  async function openMoveCases(claim) {
    const line = jacketLines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) { alert('This claim has no jacket line attached — nothing to move.'); return; }
    const { data } = await supabase
      .from('order_lines').select('order_line_id, customer_orders(acumatica_order_no, order_status, customers(company))')
      .eq('product_id', line.order_lines?.product_id).neq('order_line_id', line.order_line_id);
    setMoveCasesOptions((data || []).filter(ol => ol.customer_orders?.order_status === 'Open'));
    setMoveCasesForm({ target_order_line_id: '', cases: '' });
    setMovingClaimId(claim.claim_id);
  }
  async function saveMoveCases(claim) {
    const line = jacketLines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) return;
    const cases = Number(moveCasesForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many cases to move.'); return; }
    if (!moveCasesForm.target_order_line_id) { alert('Pick which order to move them to.'); return; }
    if (cases > Number(line.cases_to_load)) { alert(`Only ${line.cases_to_load} cases are on this allocation.`); return; }
    const { error: updateErr } = await supabase.from('jacket_lines').update({ cases_to_load: Number(line.cases_to_load) - cases, quantity_updated_at: new Date().toISOString() }).eq('jacket_line_id', line.jacket_line_id);
    if (updateErr) { alert('Move failed: ' + updateErr.message); return; }
    const { error: insertErr } = await supabase.from('jacket_lines').insert({
      jacket_id: line.jacket_id, order_line_id: Number(moveCasesForm.target_order_line_id), jacket_product_line_id: line.jacket_product_line_id,
      allocated_cost_per_case: line.allocated_cost_per_case, planned_cases: cases, cases_to_load: cases, actual_cases_loaded: 0, actual_cases_delivered: 0,
      load_status: line.load_status, quantity_updated_at: new Date().toISOString(),
    });
    if (insertErr) { alert('Move partly failed: ' + insertErr.message); return; }
    await logEvent('cases_moved', `Moved ${cases} cases to a different order (claim resolution)`);
    setMovingClaimId(null);
    loadAll();
  }
  function openCompensation(claim) { setCompensationForm({ cases: '', notes: '' }); setCompensatingClaimId(claim.claim_id); }
  async function saveCompensation(claim) {
    const line = jacketLines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) { alert('This claim has no jacket line attached.'); return; }
    const cases = Number(compensationForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many compensation cases.'); return; }
    const { error } = await supabase.from('jacket_lines').update({
      compensation_cases: Number(line.compensation_cases || 0) + cases, compensation_notes: compensationForm.notes || line.compensation_notes,
      actual_cases_delivered: Number(line.actual_cases_delivered || 0) + cases, quantity_updated_at: new Date().toISOString(),
    }).eq('jacket_line_id', line.jacket_line_id);
    if (error) { alert('Save failed: ' + error.message); return; }
    await logEvent('compensation_added', `${cases} compensation cases added, no charge`);
    setCompensatingClaimId(null);
    loadAll();
  }
  async function saveResolve(claim) {
    const adjustment = resolveForm.price_adjustment ? Number(resolveForm.price_adjustment) : null;
    const newJacketLineId = resolveForm.jacket_line_id ? Number(resolveForm.jacket_line_id) : null;
    const reassigned = newJacketLineId !== (claim.jacket_line_id || null);
    let snapshotUpdate = {};
    if (reassigned && newJacketLineId) {
      const line = jacketLines.find(l => l.jacket_line_id === newJacketLineId);
      snapshotUpdate = {
        snapshot_jacket_number: jacket.jacket_number, snapshot_order_no: line?.order_lines?.customer_orders?.acumatica_order_no || null,
        snapshot_customer: line?.order_lines?.customer_orders?.customers?.company || null, snapshot_commodity: line?.order_lines?.products?.commodity || null,
      };
    }
    const { error } = await supabase.from('claims').update({
      status: resolveForm.status, resolution: resolveForm.resolution, resolution_price_adjustment: adjustment,
      resolved_at: resolveForm.status === 'Resolved' ? new Date().toISOString() : null, flag_for_credit_memo: !!adjustment,
      jacket_line_id: newJacketLineId, ...snapshotUpdate,
    }).eq('claim_id', claim.claim_id);
    if (error) { alert('Save failed: ' + error.message); return; }
    if (adjustment) {
      const lineId = newJacketLineId || claim.jacket_line_id;
      const line = jacketLines.find(l => l.jacket_line_id === lineId);
      const ol = line?.order_lines || claim.jacket_lines?.order_lines;
      if (ol) {
        const newPrice = Number(ol.sell_price_per_case) - adjustment;
        const orderLineId = ol.order_line_id || claim.jacket_lines?.order_lines?.order_line_id;
        if (orderLineId) {
          const { error: priceError } = await supabase.from('order_lines').update({ sell_price_per_case: newPrice }).eq('order_line_id', orderLineId);
          if (priceError) alert('Claim saved, but price update failed: ' + priceError.message);
          else await logAmendments('Claim price adjustment', 'Price Decrease', [{ field: 'sell_price_per_case', before: Number(ol.sell_price_per_case), after: newPrice }], { order_line_id: orderLineId });
        }
      }
    }
    await logEvent('claim_resolved', `Claim resolved — ${resolveForm.status}${adjustment ? `, price adjusted -$${adjustment}` : ''}`);
    setResolvingId(null);
    loadAll();
  }

  if (!jacket) return <AppShell title="Jacket"><p style={{ color: 'var(--fo-text-faint)' }}>Loading…</p></AppShell>;

  const totalPallets = purchasedLines.reduce((s, p) => s + (p.products?.cases_per_pallet ? Math.ceil((p.actual_cases_received ?? p.purchased_cases) / p.products.cases_per_pallet) : 0), 0);
  const totalWeight = purchasedLines.reduce((s, p) => s + (p.products?.gross_weight_per_case || 0) * (p.actual_cases_received ?? (p.purchased_cases || 0)), 0);
  const orderCount = new Set(jacketLines.map(l => l.order_lines?.customer_orders?.acumatica_order_no).filter(Boolean)).size;
  const estRevenue = jacketLines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.order_lines?.sell_price_per_case || 0), 0);
  const estCost = jacketLines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.allocated_cost_per_case || 0), 0);
  const freightCost = freight ? Number(freight.booked_rate || 0) + Number(freight.extra_fees || 0) : 0;
  const estProfit = estRevenue - estCost - freightCost;

  // ---- Load Tracking: group by commodity + shipper (this jacket only) ----
  const commodityGroups = {};
  jacketLines.forEach(l => {
    const pid = l.order_lines?.product_id;
    const sid = l.order_lines?.supplier_id;
    if (!pid) return;
    const key = pid + '-' + sid;
    if (!commodityGroups[key]) {
      commodityGroups[key] = { productId: pid, supplierId: sid, supplierName: l.order_lines?.suppliers?.company, commodity: l.order_lines?.products?.commodity, packSize: l.order_lines?.products?.pack_size, ordered: 0, delivered: 0 };
    }
    commodityGroups[key].ordered += Number(l.cases_to_load || 0);
    commodityGroups[key].delivered += Number(l.actual_cases_delivered || 0);
  });
  Object.values(commodityGroups).forEach(g => {
    const loadRow = commodityLoads.find(c => c.product_id === g.productId && c.supplier_id === g.supplierId);
    g.loaded = loadRow ? Number(loadRow.actual_cases_loaded || 0) : 0;
    g.remaining = g.loaded - g.delivered;
  });
  const groupList = Object.values(commodityGroups);
  const pickups = stops.filter(s => s.stop_type === 'Pickup');
  const deliveries = stops.filter(s => s.stop_type === 'Delivery');
  const freightTotalCost = freight ? Number(freight.booked_rate || 0) + Number(freight.extra_fees || 0) : 0;
  const perMile = freight?.miles ? (Number(freight.booked_rate || 0) / freight.miles).toFixed(2) : null;

  return (
    <AppShell title={`Jacket ${jacket.jacket_number}`} subtitle={jacket.jacket_status}>
      <div style={{ marginBottom: 16 }}>
        <a href="/app/jackets" style={{ fontSize: 13, color: 'var(--fo-text-dim)', textDecoration: 'none' }}>← All Jackets</a>
      </div>

      {/* ---- Header ---- */}
      <div className="fo-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Stat label="Pallets" value={totalPallets} />
            <Stat label="Weight" value={`${totalWeight.toLocaleString()} lb`} />
            <Stat label="Products" value={purchasedLines.length} />
            <Stat label="Orders" value={orderCount} />
            <Stat label="Est. Revenue" value={`$${estRevenue.toLocaleString()}`} />
            <Stat label="Est. Profit" value={`$${estProfit.toLocaleString()}`} tone={estProfit >= 0 ? 'green' : 'red'} />
            {claims.length > 0 && <Stat label="Open Claims" value={claims.length} tone="red" />}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <button onClick={closeJacket} className="fo-btn fo-btn-secondary fo-btn-sm">Close Jacket</button>
            <button onClick={deleteJacketEntirely} className="fo-btn fo-btn-danger fo-btn-sm">Delete Jacket</button>
          </div>
        </div>
      </div>

      {/* ---- Tabs + Timeline layout ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 0.85fr', gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className="fo-btn fo-btn-sm"
                style={{ background: activeTab === t ? 'var(--fo-primary)' : 'var(--fo-card-bg)', color: activeTab === t ? '#fff' : 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <OverviewTab jacket={jacket} purchasedLines={purchasedLines} allJacketLinesGlobal={allJacketLinesGlobal} jacketLines={jacketLines} claims={claims} freight={freight} availableOnPurchased={availableOnPurchased} />
          )}

          {activeTab === 'Products' && (
            <div className="fo-card">
              <div className="fo-h2">Purchased Product</div>
              {purchasedLines.length === 0 && <div style={{ color: 'var(--fo-text-faint)', fontSize: 13, marginBottom: 8 }}>Nothing purchased on this Jacket yet.</div>}
              {purchasedLines.map(p => {
                const { allocated, available } = availableOnPurchased(p);
                return (
                  <div key={p.jacket_product_line_id} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 13.5 }}>
                        <strong>{p.products?.commodity} — {p.products?.pack_size}</strong> · {p.suppliers?.company || 'no supplier set'} {p.shipper_po ? `· PO ${p.shipper_po}` : ''}
                        <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginTop: 2 }}>
                          Purchased {p.purchased_cases}{p.actual_cases_received != null ? ` · Received ${p.actual_cases_received}` : ''} · Allocated {allocated} · <strong style={{ color: available > 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>Available {available}</strong> · ${Number(p.purchase_cost_per_case || 0).toFixed(2)}/cs
                        </div>
                      </div>
                      <div>
                        <button onClick={() => openAllocate(p.jacket_product_line_id)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Allocate</button>{' '}
                        <button onClick={() => openEditPurchased(p)} className="fo-btn fo-btn-secondary fo-btn-sm">Edit</button>{' '}
                        <button onClick={() => deletePurchased(p.jacket_product_line_id)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                      </div>
                    </div>
                    {allocatingLineId === p.jacket_product_line_id && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: 12 }}>Order needing {p.products?.commodity}
                          <select value={allocateForm.order_line_id} onChange={e => setAllocateForm({ ...allocateForm, order_line_id: e.target.value })} style={{ display: 'block', minWidth: 240, marginTop: 2 }}>
                            <option value="">— select —</option>
                            {allOrderLinesNeed.filter(ol => ol.product_id === p.product_id).map(ol => <option key={ol.order_line_id} value={ol.order_line_id}>{ol.customer_orders?.acumatica_order_no || 'no Acumatica #'} — {ol.customer_orders?.customers?.company} — needs {ol.needsSupply}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: 12 }}>Cases<input type="number" value={allocateForm.cases} onChange={e => setAllocateForm({ ...allocateForm, cases: e.target.value })} style={{ display: 'block', width: 80, marginTop: 2 }} /></label>
                        <button onClick={() => saveAllocate(p)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Confirm</button>
                        <button onClick={() => setAllocatingLineId(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={openAddPurchased} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>+ Add Purchased Product</button>
              {showAddPurchased && (
                <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <label style={{ fontSize: 13 }}>Supplier
                    <select value={purchasedForm.supplier_id} onChange={e => setPurchasedForm({ ...purchasedForm, supplier_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                      <option value="">— none —</option>
                      {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 13 }}>Product
                    <select value={purchasedForm.product_id} onChange={e => setPurchasedForm({ ...purchasedForm, product_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                      <option value="">— select —</option>
                      {products.map(pr => <option key={pr.product_id} value={pr.product_id}>{pr.commodity} — {pr.pack_size}</option>)}
                    </select>
                  </label>
                  {textField('Shipper PO', purchasedForm.shipper_po, v => setPurchasedForm({ ...purchasedForm, shipper_po: v }))}
                  {textField('Purchased Cases', purchasedForm.purchased_cases, v => setPurchasedForm({ ...purchasedForm, purchased_cases: v }), 'number')}
                  {textField('Actual Cases Received', purchasedForm.actual_cases_received, v => setPurchasedForm({ ...purchasedForm, actual_cases_received: v }), 'number')}
                  {textField('Purchase Cost / cs', purchasedForm.purchase_cost_per_case, v => setPurchasedForm({ ...purchasedForm, purchase_cost_per_case: v }), 'number')}
                  {textField('Fee Total / cs', purchasedForm.fee_total_per_case, v => setPurchasedForm({ ...purchasedForm, fee_total_per_case: v }), 'number')}
                  {textField('Notes', purchasedForm.notes, v => setPurchasedForm({ ...purchasedForm, notes: v }))}
                  <div style={{ gridColumn: 'span 2' }}>
                    <button onClick={savePurchased} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>{editingPurchasedId ? 'Update' : 'Save'}</button>
                    <button onClick={() => setShowAddPurchased(false)} className="fo-btn fo-btn-secondary">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Orders' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div className="fo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Demand — Open Orders Needing This Jacket's Product</div>
                  <button onClick={() => setShowNewOrder(!showNewOrder)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-primary)', color: '#fff' }}>+ New Order</button>
                </div>
                {showNewOrder && (
                  <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <label style={{ fontSize: 13 }}>Customer
                      <select value={newOrderForm.customer_id} onChange={e => setNewOrderForm({ ...newOrderForm, customer_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        <option value="">— select —</option>
                        {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.company}</option>)}
                      </select>
                    </label>
                    {textField('Acumatica Order # (optional)', newOrderForm.acumatica_no, v => setNewOrderForm({ ...newOrderForm, acumatica_no: v }))}
                    {textField('Customer PO', newOrderForm.customer_po, v => setNewOrderForm({ ...newOrderForm, customer_po: v }))}
                    <label style={{ fontSize: 13 }}>Product
                      <select value={newOrderForm.product_id} onChange={e => setNewOrderForm({ ...newOrderForm, product_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        <option value="">— select —</option>
                        {products.map(pr => <option key={pr.product_id} value={pr.product_id}>{pr.commodity} — {pr.pack_size}</option>)}
                      </select>
                    </label>
                    {textField('Cases', newOrderForm.cases, v => setNewOrderForm({ ...newOrderForm, cases: v }), 'number')}
                    <div style={{ gridColumn: 'span 2' }}>
                      <button onClick={createOrderFromHere} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save Order</button>
                      <button onClick={() => setShowNewOrder(false)} className="fo-btn fo-btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 10 }}>
                  {(() => {
                    const purchasedProductIds = new Set(purchasedLines.map(p => p.product_id));
                    const matchingDemand = allOrderLinesNeed.filter(ol => purchasedProductIds.has(ol.product_id));
                    if (matchingDemand.length === 0) return <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No open orders currently need this jacket's commodities.</div>;
                    return matchingDemand.map(ol => {
                      const matchingPurchased = allPurchasedLines.filter(p => p.product_id === ol.product_id && availableOnPurchased(p).available > 0);
                      return (
                        <div key={ol.order_line_id} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 10, marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 13.5 }}>
                              <strong>{ol.customer_orders?.customers?.company}</strong> — {ol.customer_orders?.acumatica_order_no || 'no Acumatica #'}
                              <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{ol.products?.commodity} — {ol.products?.pack_size} · needs {ol.needsSupply}</div>
                            </div>
                            <button onClick={() => openDemandAllocate(ol.order_line_id, matchingPurchased)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Allocate</button>
                          </div>
                          {demandAllocateFor === ol.order_line_id && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                              {matchingPurchased.length > 1 && (
                                <label style={{ fontSize: 12 }}>From which truck
                                  <select value={demandAllocateForm.purchased_line_id} onChange={e => setDemandAllocateForm({ ...demandAllocateForm, purchased_line_id: e.target.value })} style={{ display: 'block', minWidth: 200, marginTop: 2 }}>
                                    <option value="">— select —</option>
                                    {matchingPurchased.map(p => <option key={p.jacket_product_line_id} value={p.jacket_product_line_id}>Jacket {p.jackets?.jacket_number} — {p.suppliers?.company} — {availableOnPurchased(p).available} avail</option>)}
                                  </select>
                                </label>
                              )}
                              <label style={{ fontSize: 12 }}>Cases<input type="number" value={demandAllocateForm.cases} onChange={e => setDemandAllocateForm({ ...demandAllocateForm, cases: e.target.value })} style={{ display: 'block', width: 80, marginTop: 2 }} /></label>
                              <button onClick={() => saveDemandAllocate(ol)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Confirm</button>
                              <button onClick={() => setDemandAllocateFor(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="fo-card">
                <div className="fo-h2">Order Allocations</div>
                {jacketLines.filter(jl => jl.jacket_product_line_id).length === 0 ? (
                  <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No allocations from purchased product yet.</div>
                ) : (
                  <div className="fo-table-wrap">
                  <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                    <thead><tr><th>Customer</th><th>Order #</th><th>Commodity</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Cases</th><th>Status</th></tr></thead>
                    <tbody>{jacketLines.filter(jl => jl.jacket_product_line_id).map(jl => (
                      <tr key={jl.jacket_line_id}>
                        <td>{jl.order_lines?.customer_orders?.customers?.company}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{jl.order_lines?.customer_orders?.acumatica_order_no || '—'}</td>
                        <td>{jl.order_lines?.products?.commodity} — {jl.order_lines?.products?.pack_size}</td>
                        <td>{jl.jacket_product_lines?.suppliers?.company || '—'}</td>
                        <td style={{ textAlign: 'right' }}>{jl.cases_to_load}</td>
                        <td>{jl.load_status}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Logistics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ---- Freight ---- */}
              <div className="fo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Freight</div>
                  {!editingFreight && <button onClick={openFreightEdit} className="fo-btn fo-btn-secondary fo-btn-sm">{freight ? 'Edit' : '+ Add Freight Record'}</button>}
                </div>
                {editingFreight ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                      <label style={{ fontSize: 13 }}><span className="fo-field-label">Carrier</span>
                        <select value={freightForm.carrier} onChange={e => setFreightForm({ ...freightForm, carrier: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                          <option value="">— select —</option>
                          {carriers.map(c => <option key={c.carrier_id} value={c.name}>{c.name}</option>)}
                        </select>
                      </label>
                      <label style={{ fontSize: 13 }}><span className="fo-field-label">Trip Type</span>
                        <select value={freightForm.trip_type} onChange={e => setFreightForm({ ...freightForm, trip_type: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                          {['One Pick/One Drop', 'Multi Pick/One Drop', 'One Pick/Multi Drop', 'Multi Pick/Multi Drop'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </label>
                      {textField('Quoted Rate ($)', freightForm.quoted_rate, v => setFreightForm({ ...freightForm, quoted_rate: v }), 'number')}
                      {textField('Booked Rate ($)', freightForm.booked_rate, v => setFreightForm({ ...freightForm, booked_rate: v }), 'number')}
                      {textField('Extra Fees ($)', freightForm.extra_fees, v => setFreightForm({ ...freightForm, extra_fees: v }), 'number')}
                      {textField('Extra Fees Notes', freightForm.extra_fees_notes, v => setFreightForm({ ...freightForm, extra_fees_notes: v }))}
                      {textField('Miles', freightForm.miles, v => setFreightForm({ ...freightForm, miles: v }), 'number')}
                      <label style={{ fontSize: 13 }}><span className="fo-field-label">Status</span>
                        <select value={freightForm.status} onChange={e => setFreightForm({ ...freightForm, status: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                          <option>Quoted</option><option>Booked</option>
                        </select>
                      </label>
                      {textField('Carrier Invoice #', freightForm.carrier_invoice_number, v => setFreightForm({ ...freightForm, carrier_invoice_number: v }))}
                      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
                        <input type="checkbox" checked={!!freightForm.invoice_received} onChange={e => setFreightForm({ ...freightForm, invoice_received: e.target.checked })} /> Invoice Received
                      </label>
                      <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
                        <input type="checkbox" checked={!!freightForm.carrier_paid} onChange={e => setFreightForm({ ...freightForm, carrier_paid: e.target.checked })} /> Carrier Paid
                      </label>
                    </div>
                    <button onClick={saveFreight} className="fo-btn fo-btn-primary" style={{ marginTop: 12, marginRight: 8 }}>Save</button>
                    <button onClick={() => setEditingFreight(false)} className="fo-btn fo-btn-secondary" style={{ marginTop: 12 }}>Cancel</button>
                  </div>
                ) : freight ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, fontSize: 13, marginTop: 10 }}>
                    <div><div className="fo-label">Carrier</div>{freight.carrier}</div>
                    <div><div className="fo-label">Trip Type</div>{freight.trip_type}</div>
                    <div><div className="fo-label">Miles</div>{freight.miles || '—'}</div>
                    <div><div className="fo-label">$/Mile</div>{perMile ? `$${perMile}` : '—'}</div>
                    <div><div className="fo-label">Booked Rate</div>${Number(freight.booked_rate || 0).toLocaleString()}</div>
                    <div><div className="fo-label">Extra Fees</div>{freight.extra_fees ? `$${Number(freight.extra_fees).toLocaleString()}` : '—'}</div>
                    <div><div className="fo-label">Total Cost</div><strong>${freightTotalCost.toLocaleString()}</strong></div>
                    <div><div className="fo-label">Status</div>{freight.status}</div>
                    <div><div className="fo-label">Invoice</div>{freight.invoice_received ? 'Received' : 'Pending'}</div>
                    <div><div className="fo-label">Paid</div>{freight.carrier_paid ? 'Yes' : 'No'}</div>
                  </div>
                ) : <div style={{ color: 'var(--fo-text-faint)', fontSize: 13, marginTop: 8 }}>No freight record yet.</div>}
              </div>

              {/* ---- Stops / Route ---- */}
              <div className="fo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Route — {pickups.length} pickup(s) → {deliveries.length} delivery(ies)</div>
                  <button onClick={() => window.print()} className="fo-btn fo-btn-secondary fo-btn-sm">🖨 Print</button>
                </div>
                {stops.map(s => (
                  <div key={s.stop_id} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', overflow: 'hidden', marginTop: 10 }}>
                    <div style={{ background: 'var(--fo-section-bg)', padding: '8px 12px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className={s.stop_type === 'Pickup' ? 'fo-badge fo-badge-blue' : 'fo-badge fo-badge-green'}>#{s.stop_number} {s.stop_type}</span>
                      <strong>{s.stop_type === 'Pickup' ? s.suppliers?.company : s.customers?.company}</strong>
                      <span style={{ color: 'var(--fo-text-dim)', fontSize: 12 }}>
                        {s.stop_type === 'Pickup'
                          ? (s.supplier_locations ? `${s.supplier_locations.label} — ${s.supplier_locations.address}, ${s.supplier_locations.city} ${s.supplier_locations.state}` : `${s.suppliers?.pickup_address || ''}, ${s.suppliers?.city || ''} ${s.suppliers?.state || ''}`)
                          : (s.customer_locations ? `${s.customer_locations.label} — ${s.customer_locations.address}, ${s.customer_locations.city} ${s.customer_locations.state}` : `${s.customers?.delivery_address || ''}, ${s.customers?.city || ''} ${s.customers?.state || ''}`)}
                      </span>
                      <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>Stop # <input type="number" defaultValue={s.stop_number} onBlur={e => updateStopNumber(s.stop_id, e.target.value)} style={{ width: 44 }} /></span>
                      <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Appt <input type="datetime-local" defaultValue={toLocalInputValue(s.appointment)} onBlur={e => updateAppointment(s.stop_id, e.target.value)} style={{ fontSize: 12 }} /></span>
                    </div>
                    <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><th style={{ paddingLeft: 12 }}>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right', paddingRight: 12 }}>Pallets</th></tr></thead>
                      <tbody>{(s.stop_lines || []).map(sl => (
                        <tr key={sl.stop_line_id}>
                          <td style={{ paddingLeft: 12 }}>{sl.jacket_lines?.order_lines?.products?.commodity} — {sl.jacket_lines?.order_lines?.products?.pack_size}</td>
                          <td style={{ textAlign: 'right' }}>{sl.cases_at_stop}</td>
                          <td style={{ textAlign: 'right', paddingRight: 12 }}>{sl.pallets_at_stop}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ))}
              </div>

              {/* ---- Load Tracking ---- */}
              <div className="fo-card">
                <div className="fo-h2">Load Tracking, by Commodity</div>
                {groupList.length === 0 ? (
                  <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No allocations to track yet.</div>
                ) : groupList.map(g => {
                  const groupLines = jacketLines.filter(l => l.order_lines?.product_id === g.productId && l.order_lines?.supplier_id === g.supplierId);
                  const variance = g.loaded - g.ordered;
                  return (
                    <div key={g.productId + '-' + g.supplierId} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ background: variance !== 0 && g.loaded > 0 ? 'var(--fo-warn-bg)' : 'var(--fo-section-bg)', padding: '8px 12px', fontSize: 13, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div><strong>{g.commodity} — {g.packSize}</strong> · {g.supplierName || 'no supplier'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span>Ordered {g.ordered}</span>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Loaded
                            <input type="number" defaultValue={g.loaded} onBlur={e => updateCommodityLoad(g.productId, g.supplierId, Number(e.target.value))} style={{ width: 60 }} />
                          </label>
                          {variance !== 0 && g.loaded > 0 && <span style={{ fontWeight: 600 }}>Variance {variance > 0 ? '+' : ''}{variance}</span>}
                        </div>
                      </div>
                      <div className="fo-table-wrap" style={{ borderRadius: 0, boxShadow: 'none', border: 'none' }}>
                      <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr><th>Customer</th><th>Order #</th><th style={{ textAlign: 'right' }}>Ordered</th><th>Delivered</th><th>BOL #</th><th>Status</th><th>Customer Told</th><th></th></tr></thead>
                        <tbody>{groupLines.map(jl => {
                          const amended = jl.order_lines?.original_cases_ordered != null && Number(jl.order_lines.original_cases_ordered) !== Number(jl.order_lines?.cases_ordered);
                          const mismatch = Number(jl.cases_to_load || 0) > 0 && Number(jl.actual_cases_delivered || 0) > 0 && Number(jl.cases_to_load) !== Number(jl.actual_cases_delivered);
                          return (
                            <Fragment key={jl.jacket_line_id}>
                              <tr style={mismatch ? { background: 'var(--fo-error-bg)' } : {}}>
                                <td>{jl.order_lines?.customer_orders?.customers?.company}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{jl.order_lines?.customer_orders?.acumatica_order_no || '—'}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {amendingOrderedLineId === jl.jacket_line_id ? (
                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                      <input type="number" value={amendOrderedValue} onChange={e => setAmendOrderedValue(e.target.value)} style={{ width: 60 }} />
                                      <button onClick={() => saveAmendOrdered(jl)} className="fo-btn fo-btn-sm">Save</button>
                                      <button onClick={() => setAmendingOrderedLineId(null)} className="fo-btn fo-btn-sm">X</button>
                                    </div>
                                  ) : (
                                    <>
                                      {jl.order_lines?.cases_ordered}
                                      {amended && <div style={{ fontSize: 10, color: 'var(--fo-text-faint)' }}>orig: {jl.order_lines.original_cases_ordered}</div>}
                                      <div><button onClick={() => openAmendOrdered(jl)} className="fo-btn fo-btn-sm" style={{ marginTop: 2 }}>Amend</button></div>
                                    </>
                                  )}
                                </td>
                                <td>
                                  <input type="number" defaultValue={jl.actual_cases_delivered} onBlur={e => updateDelivered(jl.jacket_line_id, Number(e.target.value))} style={{ width: 64 }} />
                                  {jl.compensation_cases > 0 && <div style={{ fontSize: 10, color: 'var(--fo-success)' }}>incl. {jl.compensation_cases} comp.</div>}
                                </td>
                                <td><input type="text" defaultValue={jl.bol_number || ''} onBlur={e => updateJacketLineField(jl.jacket_line_id, 'bol_number', e.target.value)} style={{ width: 90 }} placeholder="BOL #" /></td>
                                <td>
                                  <select defaultValue={jl.load_status} onChange={e => updateJacketLineField(jl.jacket_line_id, 'load_status', e.target.value)}>
                                    {['Planned', 'Loading', 'Loaded', 'In Transit', 'Delivered', 'Short', 'Exception'].map(s => <option key={s}>{s}</option>)}
                                  </select>
                                </td>
                                <td style={{ minWidth: 150 }}>
                                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 4 }}>
                                    {['Loaded', 'In Transit', 'Delivered', 'Delayed / Issue'].map(t => (
                                      <button key={t} onClick={() => logNotification(jl.jacket_line_id, t)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-primary)', color: '#fff' }}>+ {t}</button>
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
                                <td><button onClick={() => openReassignLine(jl)} className="fo-btn fo-btn-sm">Reassign</button></td>
                              </tr>
                              {reassigningLineId === jl.jacket_line_id && (
                                <tr>
                                  <td colSpan={8} style={{ background: 'var(--fo-section-bg)', padding: 10 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                      <label style={{ fontSize: 12 }}>Move to a different order
                                        <select value={reassignTarget} onChange={e => setReassignTarget(e.target.value)} style={{ display: 'block', minWidth: 240, marginTop: 2 }}>
                                          <option value="">— select —</option>
                                          {reassignOptions.map(ol => <option key={ol.order_line_id} value={ol.order_line_id}>{ol.customer_orders?.acumatica_order_no} — {ol.customer_orders?.customers?.company}</option>)}
                                        </select>
                                      </label>
                                      <button onClick={() => saveReassignLine(jl)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Confirm</button>
                                      <button onClick={() => setReassigningLineId(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}</tbody>
                      </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ---- Claims ---- */}
              <div className="fo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Claims / Quality Issues</div>
                  <button onClick={() => setShowClaimForm(!showClaimForm)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-primary)', color: '#fff' }}>+ Log Claim</button>
                </div>
                {showClaimForm && (
                  <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                    <label style={{ fontSize: 13 }}><span className="fo-field-label">Jacket Line</span>
                      <select value={claimForm.jacket_line_id} onChange={e => setClaimForm({ ...claimForm, jacket_line_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        <option value="">— select —</option>
                        {jacketLines.map(l => <option key={l.jacket_line_id} value={l.jacket_line_id}>{l.order_lines?.products?.commodity} — {l.order_lines?.customer_orders?.customers?.company}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: 13 }}><span className="fo-field-label">Type</span>
                      <select value={claimForm.claim_type} onChange={e => setClaimForm({ ...claimForm, claim_type: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        <option>Quality</option><option>Shortage</option><option>Overage</option><option>Damage</option><option>Pricing</option><option>Other</option>
                      </select>
                    </label>
                    {textField('Description', claimForm.description, v => setClaimForm({ ...claimForm, description: v }))}
                    <div style={{ gridColumn: 'span 3' }}>
                      <button onClick={saveClaim} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save Claim</button>
                      <button onClick={() => setShowClaimForm(false)} className="fo-btn fo-btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  {claims.length === 0 ? <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No claims on this Jacket.</div> : claims.map(c => (
                    <div key={c.claim_id} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 10, marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontSize: 13.5 }}>
                          <span className={c.status === 'Open' ? 'fo-badge fo-badge-amber' : c.status === 'Under Review' ? 'fo-badge fo-badge-amber' : 'fo-badge fo-badge-green'}>{c.status}</span>{' '}
                          <strong>{c.claim_type}</strong> — {c.description}
                          <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{c.snapshot_customer} · {c.snapshot_commodity}</div>
                        </div>
                        <div>
                          <button onClick={() => openResolve(c)} className="fo-btn fo-btn-sm">{c.status === 'Open' ? 'Resolve' : 'Edit'}</button>{' '}
                          <button onClick={() => openMoveCases(c)} className="fo-btn fo-btn-sm">Move Cases</button>{' '}
                          <button onClick={() => openCompensation(c)} className="fo-btn fo-btn-sm">Add Compensation</button>{' '}
                          <button onClick={() => deleteClaim(c.claim_id)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                        </div>
                      </div>
                      {resolvingId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                          <label style={{ fontSize: 13 }}><span className="fo-field-label">Status</span>
                            <select value={resolveForm.status} onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                              <option>Open</option><option>Under Review</option><option>Resolved</option>
                            </select>
                          </label>
                          {textField('Price Adjustment ($/case, optional)', resolveForm.price_adjustment, v => setResolveForm({ ...resolveForm, price_adjustment: v }), 'number')}
                          <div style={{ gridColumn: 'span 2' }}>{textField('Resolution Notes', resolveForm.resolution, v => setResolveForm({ ...resolveForm, resolution: v }))}</div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <button onClick={() => saveResolve(c)} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save</button>
                            <button onClick={() => setResolvingId(null)} className="fo-btn fo-btn-secondary">Cancel</button>
                          </div>
                        </div>
                      )}
                      {movingClaimId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 13 }}>Move to which order?
                            <select value={moveCasesForm.target_order_line_id} onChange={e => setMoveCasesForm({ ...moveCasesForm, target_order_line_id: e.target.value })} style={{ display: 'block', minWidth: 220, marginTop: 4 }}>
                              <option value="">— select —</option>
                              {moveCasesOptions.map(ol => <option key={ol.order_line_id} value={ol.order_line_id}>{ol.customer_orders?.acumatica_order_no} — {ol.customer_orders?.customers?.company}</option>)}
                            </select>
                          </label>
                          <label style={{ fontSize: 13 }}>Cases<input type="number" value={moveCasesForm.cases} onChange={e => setMoveCasesForm({ ...moveCasesForm, cases: e.target.value })} style={{ display: 'block', width: 90, marginTop: 4 }} /></label>
                          <button onClick={() => saveMoveCases(c)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Confirm</button>
                          <button onClick={() => setMovingClaimId(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                        </div>
                      )}
                      {compensatingClaimId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 13 }}>Compensation cases<input type="number" value={compensationForm.cases} onChange={e => setCompensationForm({ ...compensationForm, cases: e.target.value })} style={{ display: 'block', width: 90, marginTop: 4 }} /></label>
                          <label style={{ fontSize: 13 }}>Notes<input value={compensationForm.notes} onChange={e => setCompensationForm({ ...compensationForm, notes: e.target.value })} style={{ display: 'block', minWidth: 200, marginTop: 4 }} /></label>
                          <button onClick={() => saveCompensation(c)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Confirm</button>
                          <button onClick={() => setCompensatingClaimId(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--fo-text-faint)' }}>Note: "rolled/extra product" reconciliation across jackets still lives on the standalone Load Tracking page for now — that page stays available even though it's off the main nav.</div>
            </div>
          )}

          {activeTab === 'Financials' && (
            <div className="fo-card">
              <div className="fo-h2">Profit Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
                <FinRow label="Product Revenue" value={estRevenue} />
                <FinRow label="Product Cost" value={-estCost} />
                <FinRow label="Freight Cost" value={-freightCost} />
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--fo-border-soft)' }}>
                <div className="fo-kpi-label">Estimated Profit</div>
                <div className="fo-kpi-value" style={{ color: estProfit >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>${estProfit.toLocaleString()}</div>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--fo-border-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Supplier Payment</div>
                  {!editingPayment && <button onClick={openEditPayment} className="fo-btn fo-btn-secondary fo-btn-sm">Edit</button>}
                </div>
                {editingPayment ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
                    <label style={{ fontSize: 13 }}>
                      <span className="fo-field-label">Status</span>
                      <select value={paymentForm.supplier_payment_status} onChange={e => setPaymentForm({ ...paymentForm, supplier_payment_status: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        {['Unpaid', 'Partially Paid', 'Paid'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                    {textField('Amount Paid', paymentForm.supplier_amount_paid, v => setPaymentForm({ ...paymentForm, supplier_amount_paid: v }), 'number')}
                    {textField('Payment Arrangement', paymentForm.supplier_payment_arrangement, v => setPaymentForm({ ...paymentForm, supplier_payment_arrangement: v }))}
                    {textField('Due Date', paymentForm.supplier_payment_due_date, v => setPaymentForm({ ...paymentForm, supplier_payment_due_date: v }), 'date')}
                    <div style={{ gridColumn: 'span 2' }}>{textField('Notes', paymentForm.supplier_payment_notes, v => setPaymentForm({ ...paymentForm, supplier_payment_notes: v }))}</div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <button onClick={saveSupplierPayment} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save</button>
                      <button onClick={() => setEditingPayment(false)} className="fo-btn fo-btn-secondary">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, marginTop: 8 }}>
                    <span className={jacket.supplier_payment_status === 'Paid' ? 'fo-badge fo-badge-green' : jacket.supplier_payment_status === 'Partially Paid' ? 'fo-badge fo-badge-amber' : 'fo-badge fo-badge-red'}>{jacket.supplier_payment_status || 'Unpaid'}</span>
                    {jacket.supplier_amount_paid ? <span style={{ marginLeft: 10, color: 'var(--fo-text-dim)' }}>${Number(jacket.supplier_amount_paid).toLocaleString()} paid</span> : null}
                    {jacket.supplier_payment_due_date && <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginTop: 4 }}>Due {jacket.supplier_payment_due_date}</div>}
                    {jacket.supplier_payment_arrangement && <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginTop: 4 }}>{jacket.supplier_payment_arrangement}</div>}
                    {jacket.supplier_payment_notes && <div style={{ fontSize: 12, color: 'var(--fo-text-faint)', marginTop: 4 }}>{jacket.supplier_payment_notes}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'Documents' && (
            <div className="fo-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="fo-h2" style={{ marginBottom: 0 }}>Documents</div>
                <button onClick={() => setShowAddDoc(!showAddDoc)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-primary)', color: '#fff' }}>+ Add Document</button>
              </div>
              {showAddDoc && (
                <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {textField('Document Type (e.g. BOL, POD)', docForm.document_type, v => setDocForm({ ...docForm, document_type: v }))}
                  {textField('File Name / Title', docForm.file_name, v => setDocForm({ ...docForm, file_name: v }))}
                  {textField('Link / URL', docForm.url, v => setDocForm({ ...docForm, url: v }))}
                  {textField('Notes', docForm.notes, v => setDocForm({ ...docForm, notes: v }))}
                  <div style={{ gridColumn: 'span 2' }}>
                    <button onClick={saveDocument} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save</button>
                    <button onClick={() => setShowAddDoc(false)} className="fo-btn fo-btn-secondary">Cancel</button>
                  </div>
                  <div style={{ gridColumn: 'span 2', fontSize: 11, color: 'var(--fo-text-faint)' }}>This stores a reference (name + link), not a file upload — real file storage is a follow-up setup step.</div>
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                {documents.length === 0 ? <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No documents on file yet.</div> : documents.map(d => (
                  <div key={d.document_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--fo-border-soft)', fontSize: 13.5 }}>
                    <div>
                      {d.document_type && <span className="fo-badge fo-badge-gray" style={{ marginRight: 8 }}>{d.document_type}</span>}
                      {d.url ? <a href={d.url} target="_blank" rel="noreferrer" style={{ color: 'var(--fo-info)' }}>{d.file_name}</a> : d.file_name}
                      {d.notes && <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{d.notes}</div>}
                    </div>
                    <button onClick={() => deleteDocument(d.document_id)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ---- Timeline ---- */}
        <div className="fo-card fo-card-tight" style={{ position: 'sticky', top: 20 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 }}>Timeline / Activity</div>
          {amendments.length > 0 && (
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--fo-border-soft)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Amendments</div>
              {amendments.map(a => (
                <div key={a.amendment_id} style={{ fontSize: 11.5, padding: '5px 0', borderBottom: '1px solid var(--fo-border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                    <div>
                      <strong>{a.amendment_name}</strong> {a.status === 'Reversed' && <span className="fo-badge fo-badge-gray" style={{ fontSize: 9 }}>Reversed</span>}
                      <div style={{ color: 'var(--fo-text-dim)' }}>
                        {a.original_value && <>orig: {a.original_value} </>}
                        {a.adjustment_value && <>· adj: {a.adjustment_value} </>}
                        {a.new_effective_value && <>· now: {a.new_effective_value}</>}
                      </div>
                      {a.reason && <div style={{ color: 'var(--fo-text-faint)' }}>{a.reason}</div>}
                    </div>
                    {a.status === 'Active' && <button onClick={() => reverseAmendment(a)} className="fo-btn fo-btn-sm" style={{ flexShrink: 0 }}>Reverse</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {editingDetails && (
            <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--fo-border-soft)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {textField('Carrier', detailsForm.carrier, v => setDetailsForm({ ...detailsForm, carrier: v }))}
                {textField('Driver', detailsForm.driver, v => setDetailsForm({ ...detailsForm, driver: v }))}
                <label style={{ fontSize: 13 }}>Status
                  <select value={detailsForm.jacket_status} onChange={e => setDetailsForm({ ...detailsForm, jacket_status: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                    {['Planning', 'Booked', 'Loading', 'Dispatched', 'In Transit', 'Delivered', 'Closed', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </label>
              </div>
              <button onClick={updateJacketDetails} className="fo-btn fo-btn-primary fo-btn-sm" style={{ marginTop: 8, marginRight: 6 }}>Save</button>
              <button onClick={() => setEditingDetails(false)} className="fo-btn fo-btn-secondary fo-btn-sm" style={{ marginTop: 8 }}>Cancel</button>
            </div>
          )}
          {!editingDetails && <button onClick={openEditDetails} className="fo-btn fo-btn-secondary fo-btn-sm" style={{ marginBottom: 12 }}>Edit Jacket Details</button>}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {events.length === 0 ? <div style={{ color: 'var(--fo-text-faint)', fontSize: 12 }}>No activity logged yet.</div> : events.map(ev => (
              <div key={ev.event_id} style={{ padding: '6px 0', borderBottom: '1px solid var(--fo-border-soft)' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.description}</div>
                {(ev.original_value || ev.adjustment || ev.new_value) && (
                  <div style={{ fontSize: 11.5, color: 'var(--fo-text-dim)', marginTop: 2 }}>
                    {ev.original_value && <>orig: {ev.original_value} </>}
                    {ev.adjustment && <>· adj: {ev.adjustment} </>}
                    {ev.new_value && <>· now: {ev.new_value}</>}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 2 }}>{new Date(ev.created_at).toLocaleString()} · {ev.created_by}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div>
      <div className="fo-kpi-label">{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: tone === 'red' ? 'var(--fo-error)' : tone === 'green' ? 'var(--fo-success)' : 'var(--fo-primary)' }}>{value}</div>
    </div>
  );
}
function FinRow({ label, value }) {
  return (
    <div>
      <div className="fo-kpi-label">{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: value < 0 ? 'var(--fo-error)' : 'var(--fo-text)' }}>{value < 0 ? '-' : ''}${Math.abs(value).toLocaleString()}</div>
    </div>
  );
}
function textField(label, value, onChange, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>
      <span className="fo-field-label">{label}</span>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }} />
    </label>
  );
}

function OverviewTab({ jacket, purchasedLines, jacketLines, claims, freight, availableOnPurchased }) {
  const hasProduct = purchasedLines.length > 0;
  const stillAvailable = purchasedLines.reduce((s, p) => s + availableOnPurchased(p).available, 0);
  const attention = [];
  if (stillAvailable > 0) attention.push(`${stillAvailable} cases still available to sell`);
  if (claims.length > 0) attention.push(`${claims.length} open claim(s)`);
  if (hasProduct && !freight) attention.push('Carrier not booked');
  if (freight && !freight.carrier_paid) attention.push('Carrier not yet paid');
  if (hasProduct && jacket.supplier_payment_status && jacket.supplier_payment_status !== 'Paid') attention.push(`Supplier payment: ${jacket.supplier_payment_status}`);

  return (
    <div className="fo-card">
      <div className="fo-h2">Jacket Health</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
        <HealthRow label="Supplier" value={!hasProduct ? 'Not Purchased Yet' : 'Confirmed'} tone={!hasProduct ? 'gray' : 'green'} />
        <HealthRow label="Product" value={!hasProduct ? 'Not Purchased Yet' : stillAvailable > 0 ? `${stillAvailable} cs Available` : 'Fully Allocated'} tone={!hasProduct ? 'gray' : stillAvailable === 0 ? 'green' : 'amber'} />
        <HealthRow label="Logistics" value={jacket.jacket_status} tone={['In Transit', 'Delivered', 'Closed'].includes(jacket.jacket_status) ? 'green' : jacket.jacket_status === 'Planning' ? 'gray' : 'amber'} />
        <HealthRow label="Freight" value={freight ? freight.status : hasProduct ? 'Unbooked' : 'N/A'} tone={freight ? 'green' : hasProduct ? 'amber' : 'gray'} />
        <HealthRow label="Financials" value={jacket.jacket_status === 'Closed' ? 'Closed' : 'Open'} tone={jacket.jacket_status === 'Closed' ? 'green' : 'gray'} />
        <HealthRow label="Claims" value={claims.length > 0 ? `${claims.length} Open` : 'None'} tone={claims.length > 0 ? 'amber' : 'green'} />
      </div>
      <div className="fo-h2">What Needs Attention</div>
      {attention.length === 0 ? (
        <span className="fo-badge fo-badge-green">All clear</span>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attention.map((a, i) => <div key={i}><span className="fo-badge fo-badge-amber">{a}</span></div>)}
        </div>
      )}
    </div>
  );
}
function HealthRow({ label, value, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--fo-section-bg)', borderRadius: 'var(--fo-radius-sm)' }}>
      <span style={{ fontSize: 13, color: 'var(--fo-text-dim)' }}>{label}</span>
      <span className={`fo-badge fo-badge-${tone === 'green' ? 'green' : tone === 'amber' ? 'amber' : 'gray'}`}>{value}</span>
    </div>
  );
}
