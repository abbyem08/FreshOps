// pages/app/jacket/[id].js
import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/router';
import AppShell from '../../../components/AppShell';
import Logo from '../../../components/Logo';
import { supabase } from '../../../lib/supabaseClient';
import { ProgressBar, BarChart } from '../../../components/charts';
import ProductIcon from '../../../components/ProductIcon';

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
  const [needs, setNeeds] = useState([]);
  const [showNeeds, setShowNeeds] = useState(true);

  const [showAddPurchased, setShowAddPurchased] = useState(false);
  const [purchasedForm, setPurchasedForm] = useState(BLANK_PURCHASED);
  const [editingPurchasedId, setEditingPurchasedId] = useState(null);
  const [editingPurchasedOriginal, setEditingPurchasedOriginal] = useState(null);
  const [allocatingLineId, setAllocatingLineId] = useState(null);
  const [allocateForm, setAllocateForm] = useState({ order_line_id: '', cases: '' });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showNewFreightOnly, setShowNewFreightOnly] = useState(false);
  const [freightOnlyForm, setFreightOnlyForm] = useState({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', commodity_description: '', cases: '', pallets: '', weight: '', customer_freight_charge: '', allocated_freight_cost: '', pickup_location: '', delivery_location: '', notes: '' });
  const [freightOnlyLines, setFreightOnlyLines] = useState([]);
  const [editingFreightOnlyId, setEditingFreightOnlyId] = useState(null);
  const [editingDemandLineId, setEditingDemandLineId] = useState(null);
  const [editDemandCasesValue, setEditDemandCasesValue] = useState('');
  const [newOrderForm, setNewOrderForm] = useState({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', cases: '' });
  const [demandAllocateFor, setDemandAllocateFor] = useState(null);
  const [demandAllocateForm, setDemandAllocateForm] = useState({ purchased_line_id: '', cases: '' });
  const [editingDetails, setEditingDetails] = useState(false);
  const [showActivityDrawer, setShowActivityDrawer] = useState(false);
  const [detailsForm, setDetailsForm] = useState({});
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({ document_type: '', file_name: '', url: '', notes: '' });
  const [editingPayment, setEditingPayment] = useState(false);
  const [financialAdjustments, setFinancialAdjustments] = useState([]);
  const [showAddAdjustment, setShowAddAdjustment] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState({ adjustment_type: 'Other', description: '', amount: '', direction: 'Cost', adjustment_date: '', notes: '' });
  const [paymentForm, setPaymentForm] = useState({});
  const [carriers, setCarriers] = useState([]);
  const [editingFreight, setEditingFreight] = useState(false);
  const [freightForm, setFreightForm] = useState({});
  const [commodityLoads, setCommodityLoads] = useState([]);
  const [notificationsByLine, setNotificationsByLine] = useState({});
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ jacket_line_id: '', claim_type: 'Quality', description: '' });
  const [resolvingId, setResolvingId] = useState(null);
  const [editingClaimId, setEditingClaimId] = useState(null);
  const [editClaimForm, setEditClaimForm] = useState({ claim_type: 'Quality', description: '' });
  const [resolveForm, setResolveForm] = useState({ status: 'Resolved', resolution: '', price_adjustment: '', new_cases_ordered: '', jacket_line_id: '' });
  const [amendingOrderedLineId, setAmendingOrderedLineId] = useState(null);
  const [amendOrderedValue, setAmendOrderedValue] = useState('');
  const [reassigningLineId, setReassigningLineId] = useState(null);
  const [reassignOptions, setReassignOptions] = useState([]);
  const [reassignTarget, setReassignTarget] = useState('');
  const [compensatingClaimId, setCompensatingClaimId] = useState(null);
  const [caseDispositions, setCaseDispositions] = useState([]);
  const [rejectingClaimId, setRejectingClaimId] = useState(null);
  const [rejectForm, setRejectForm] = useState({ cases: '', notes: '' });
  const [reassignPickerFor, setReassignPickerFor] = useState(null); // { claimId, jacketLineId, available }
  const [reassignMode, setReassignMode] = useState(null); // 'existing' | 'allocation' | 'new'
  const [reassignReason, setReassignReason] = useState('Rejected Product Reassignment');
  const [assignExistingForm, setAssignExistingForm] = useState({ order_line_id: '', cases: '' });
  const [assignExistingOptions, setAssignExistingOptions] = useState([]);
  const [newOrderFromRejectForm, setNewOrderFromRejectForm] = useState({ customer_id: '', cases: '', sell_price_per_case: '', customer_po: '' });
  const [showDumpFor, setShowDumpFor] = useState(null); // { claimId, jacketLineId, available }
  const [dumpForm, setDumpForm] = useState({ cases: '', dump_date: '', reason: 'Quality/Condition', dump_fee: '', notes: '' });
  const [compensationForm, setCompensationForm] = useState({ cases: '', notes: '' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data?.user?.email) setUserEmail(data.user.email); });
  }, []);
  useEffect(() => { if (jacketId) loadAll(); }, [jacketId]);
  useEffect(() => {
    document.body.style.overflow = showActivityDrawer ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showActivityDrawer]);

  async function logEvent(event_type, description, original_value = null, adjustment = null, new_value = null) {
    await supabase.from('jacket_events').insert({ jacket_id: jacketId, event_type, description, original_value, adjustment, new_value, created_by: userEmail });
  }

  async function loadAll() {
    const { data: j } = await supabase.from('jackets').select('*').eq('jacket_id', jacketId).single();
    setJacket(j);

    const { data: s } = await supabase.from('suppliers').select('supplier_id, company, per_case_fee').eq('active', true).order('company');
    setSuppliers(s || []);
    const { data: p } = await supabase.from('products').select('product_id, commodity, pack_size, cases_per_pallet, gross_weight_per_case').eq('active', true).order('commodity');
    setProducts(p || []);
    const { data: c } = await supabase.from('customers').select('customer_id, company').eq('active', true).order('company');
    setCustomers(c || []);

    const { data: lines } = await supabase
      .from('jacket_lines')
      .select('*, order_lines(*, customer_orders(acumatica_order_no, customer_id, customers(company)), suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)), jacket_product_lines(suppliers(company))')
      .eq('jacket_id', jacketId)
      .order('jacket_line_id');
    setJacketLines(lines || []);

    const { data: allJacketLines } = await supabase.from('jacket_lines').select('order_line_id, cases_to_load, jacket_product_line_id, jackets(jacket_status)');
    setAllJacketLinesGlobal(allJacketLines || []);

    const { data: purchased } = await supabase.from('jacket_product_lines').select('*, suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)').eq('jacket_id', jacketId).order('jacket_product_line_id');
    setPurchasedLines(purchased || []);
    const { data: allPurchased } = await supabase.from('jacket_product_lines').select('*, jackets(jacket_number, jacket_status), suppliers(company), products(commodity, pack_size, cases_per_pallet, gross_weight_per_case)').order('jacket_product_line_id');
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

    const { data: carrierRows } = await supabase.from('carriers').select('carrier_id, name').eq('active', true).order('name');
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
      const { data: notifs } = await supabase.from('customer_notifications').select('*').in('jacket_line_id', lineIds).order('notified_at', { ascending: true }).order('notification_id', { ascending: true });
      const grouped = {};
      (notifs || []).forEach(n => { grouped[n.jacket_line_id] = grouped[n.jacket_line_id] || []; grouped[n.jacket_line_id].push(n); });
      setNotificationsByLine(grouped);
    } else {
      setNotificationsByLine({});
    }

    const { data: cl } = await supabase
      .from('claims')
      .select('*, jacket_lines(jacket_id, order_line_id, order_lines(order_line_id, sell_price_per_case, products(commodity, pack_size), customer_orders(acumatica_order_no, customers(company))))')
      .order('date_opened', { ascending: false })
      .order('claim_id', { ascending: false });
    setClaims((cl || []).filter(c => c.jacket_lines?.jacket_id === jacketId));

    const { data: ev } = await supabase.from('jacket_events').select('*').eq('jacket_id', jacketId).order('created_at', { ascending: false }).order('event_id', { ascending: false });
    setEvents(ev || []);
    const { data: am } = await supabase.from('amendments').select('*').eq('jacket_id', jacketId).order('created_at', { ascending: false }).order('amendment_id', { ascending: false });
    setAmendments(am || []);
    const { data: docs } = await supabase.from('jacket_documents').select('*').eq('jacket_id', jacketId).order('created_at', { ascending: false }).order('document_id', { ascending: false });
    setDocuments(docs || []);
    const { data: fol } = await supabase.from('freight_only_lines').select('*, customer_orders(acumatica_order_no, customer_po, customers(company))').eq('jacket_id', jacketId).order('created_at', { ascending: false }).order('freight_only_line_id', { ascending: false });
    setFreightOnlyLines(fol || []);

    const { data: fa } = await supabase.from('financial_adjustments').select('*').eq('jacket_id', jacketId).order('adjustment_date', { ascending: false }).order('adjustment_id', { ascending: false });
    setFinancialAdjustments(fa || []);

    const { data: allJacketLineIdsRows } = await supabase.from('jacket_lines').select('jacket_line_id').eq('jacket_id', jacketId);
    const allJacketLineIds = (allJacketLineIdsRows || []).map(r => r.jacket_line_id);
    if (allJacketLineIds.length) {
      const { data: cd } = await supabase.from('case_dispositions').select('*').in('jacket_line_id', allJacketLineIds).order('created_at').order('disposition_id');
      setCaseDispositions(cd || []);
    } else {
      setCaseDispositions([]);
    }

    // Cases Still Needed — across ALL open orders, not just this jacket's,
    // so it stays useful for sourcing/truck planning while you're in here
    const { data: allOLForNeeds } = await supabase.from('order_lines').select('order_line_id, cases_ordered, product_id, products(commodity, pack_size), customer_orders(order_status)').eq('customer_orders.order_status', 'Open');
    const assignedByOrderLine = {};
    (allJacketLines || []).forEach(l => {
      if (l.jackets?.jacket_status === 'Cancelled' || !l.order_line_id) return;
      assignedByOrderLine[l.order_line_id] = (assignedByOrderLine[l.order_line_id] || 0) + Number(l.cases_to_load || 0);
    });
    const needGroups = {};
    (allOLForNeeds || []).forEach(l => {
      if (!l.customer_orders || l.customer_orders.order_status !== 'Open') return;
      const key = l.product_id;
      if (!needGroups[key]) needGroups[key] = { commodity: l.products?.commodity, packSize: l.products?.pack_size, needed: 0 };
      const assigned = assignedByOrderLine[l.order_line_id] || 0;
      const remaining = Number(l.cases_ordered || 0) - assigned;
      if (remaining > 0) needGroups[key].needed += remaining;
    });
    setNeeds(Object.values(needGroups).filter(g => g.needed > 0).sort((a, b) => b.needed - a.needed));
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
      const { data: affectedLines } = await supabase.from('jacket_lines').select('order_line_id').eq('jacket_product_line_id', editingPurchasedId);
      const affectedOrderLineIds = (affectedLines || []).map(l => l.order_line_id).filter(Boolean);
      if (affectedOrderLineIds.length) {
        await supabase.from('order_lines').update({ fob_cost_per_case: newAllocatedCost }).in('order_line_id', affectedOrderLineIds);
      }
      const o = editingPurchasedOriginal || {};
      await logAmendments(`${productLabel?.commodity || 'Product'} amended`, 'Cost Change', [
        { field: 'purchased_cases', before: Number(o.purchased_cases ?? 0), after: payload.purchased_cases },
        { field: 'actual_cases_received', before: o.actual_cases_received != null ? Number(o.actual_cases_received) : null, after: payload.actual_cases_received },
        { field: 'purchase_cost_per_case', before: Number(o.purchase_cost_per_case ?? 0), after: payload.purchase_cost_per_case },
        { field: 'fee_total_per_case', before: Number(o.fee_total_per_case ?? 0), after: payload.fee_total_per_case },
        { field: 'shipper_po', before: o.shipper_po || '', after: payload.shipper_po || '' },
      ], 'jacket_product_lines', editingPurchasedId);
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
    if (!confirm('Remove this purchased product line? Any allocations already made from it will lose their source link (they are not deleted) — but the pickup stop tied to this supplier will be cleaned up if nothing else needs it.')) return;
    const { data: affectedLines } = await supabase.from('jacket_lines').select('jacket_line_id').eq('jacket_product_line_id', id);
    const affectedLineIds = (affectedLines || []).map(l => l.jacket_line_id);
    let touchedStopIds = [];
    if (affectedLineIds.length) {
      const { data: touchedStopLines } = await supabase.from('stop_lines').select('stop_id').in('jacket_line_id', affectedLineIds);
      touchedStopIds = [...new Set((touchedStopLines || []).map(sl => sl.stop_id))];
      await supabase.from('stop_lines').delete().in('jacket_line_id', affectedLineIds);
    }
    await supabase.from('jacket_lines').update({ jacket_product_line_id: null }).eq('jacket_product_line_id', id);
    const { error } = await supabase.from('jacket_product_lines').delete().eq('jacket_product_line_id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    // remove any stop that no longer has any cases on it
    for (const stopId of touchedStopIds) {
      const { data: remaining } = await supabase.from('stop_lines').select('stop_line_id').eq('stop_id', stopId);
      if (!remaining || remaining.length === 0) await supabase.from('stops').delete().eq('stop_id', stopId);
    }
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
    // sync the real purchase cost onto the order line — this is the
    // authoritative cost once an allocation exists, so you never have to
    // enter it separately on Customer Orders and Purchased Product
    await supabase.from('order_lines').update({ fob_cost_per_case: allocatedCost }).eq('order_line_id', orderLine.order_line_id);
    const pickupStop = await findOrCreateStop('Pickup', purchased.supplier_id, purchased.supplier_location_id || null, null, null);
    const deliveryStop = await findOrCreateStop('Delivery', null, null, orderLine.customer_orders.customer_id, orderLine.customer_orders.customer_location_id || null);
    await supabase.from('stop_lines').insert([
      { stop_id: pickupStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
      { stop_id: deliveryStop.stop_id, jacket_line_id: jl.jacket_line_id, cases_at_stop: cases, pallets_at_stop: estPallets },
    ]);
    await logEvent('order_allocated', `Allocated ${cases} cases of ${p.commodity} to ${orderLine.customer_orders?.customers?.company} (${orderLine.customer_orders?.acumatica_order_no || 'no Acumatica #'})`);
    return true;
  }
  const [editingAllocationId, setEditingAllocationId] = useState(null);
  const [editAllocationValue, setEditAllocationValue] = useState('');
  function openEditAllocation(jl) { setEditingAllocationId(jl.jacket_line_id); setEditAllocationValue(jl.cases_to_load ?? ''); }
  async function saveEditAllocation(jl) {
    const newCases = Number(editAllocationValue);
    if (!newCases || newCases <= 0) { alert('Enter a valid number of cases.'); return; }
    const purchased = purchasedLines.find(p => p.jacket_product_line_id === jl.jacket_product_line_id);
    if (purchased) {
      const { available } = availableOnPurchased(purchased);
      const capacityWithThisLineFreed = available + Number(jl.cases_to_load || 0);
      if (newCases > capacityWithThisLineFreed) { alert(`Only ${capacityWithThisLineFreed} cases available on this purchased line.`); return; }
    }
    const isShortage = newCases < Number(jl.cases_to_load || 0);
    const { error } = await supabase.from('jacket_lines').update({ cases_to_load: newCases, quantity_updated_at: new Date().toISOString() }).eq('jacket_line_id', jl.jacket_line_id);
    if (error) { alert('Save failed: ' + error.message); return; }
    await logAmendments('Allocation cases changed', newCases >= jl.cases_to_load ? 'Quantity Increase' : 'Quantity Decrease', [{ field: 'cases_to_load', before: Number(jl.cases_to_load || 0), after: newCases }], 'jacket_lines', jl.jacket_line_id);

    // A reduced allocation can leave the order showing a phantom "still
    // needed" count. If the customer is genuinely accepting the shortage,
    // offer to sync the order's own quantity down to match right here —
    // rather than leaving two numbers to silently drift apart.
    if (isShortage && jl.order_line_id) {
      const { data: allAllocs } = await supabase.from('jacket_lines').select('cases_to_load, jackets(jacket_status)').eq('order_line_id', jl.order_line_id);
      const totalAllocated = (allAllocs || []).reduce((s, a) => a.jackets?.jacket_status === 'Cancelled' ? s : s + Number(a.cases_to_load || 0), 0);
      const orderedCases = Number(jl.order_lines?.cases_ordered || 0);
      if (totalAllocated < orderedCases) {
        const shortBy = orderedCases - totalAllocated;
        if (confirm(`This leaves ${shortBy} cases still showing as needed for this order. If the customer is accepting the shortage (no replacement needed), I can reduce the order to ${totalAllocated} cases to match. Reduce the order now?`)) {
          await supabase.from('order_lines').update({ cases_ordered: totalAllocated, amended_at: new Date().toISOString() }).eq('order_line_id', jl.order_line_id);
          await logAmendments('Order quantity synced to shortage', 'Shortage', [{ field: 'cases_ordered', before: orderedCases, after: totalAllocated }], 'order_lines', jl.order_line_id);
        }
      }
    }
    setEditingAllocationId(null);
    loadAll();
  }
  async function removeAllocation(jl) {
    if (!confirm(`Remove this allocation (${jl.cases_to_load} cases of ${jl.order_lines?.products?.commodity} for ${jl.order_lines?.customer_orders?.customers?.company})? Those cases go back to Available on the purchased line.`)) return;
    await supabase.from('stop_lines').delete().eq('jacket_line_id', jl.jacket_line_id);
    const { error } = await supabase.from('jacket_lines').delete().eq('jacket_line_id', jl.jacket_line_id);
    if (error) { alert('Remove failed: ' + error.message); return; }
    await logEvent('allocation_removed', `Allocation removed — ${jl.cases_to_load} cases of ${jl.order_lines?.products?.commodity} for ${jl.order_lines?.customer_orders?.customers?.company}`);
    loadAll();
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

  function openEditFreightOnly(f) {
    setFreightOnlyForm({
      customer_id: '', acumatica_no: f.customer_orders?.acumatica_order_no || '', customer_po: f.customer_orders?.customer_po || '',
      product_id: f.product_id ? String(f.product_id) : '', commodity_description: f.commodity_description || '', cases: f.cases ?? '', pallets: f.pallets ?? '', weight: f.weight ?? '',
      customer_freight_charge: f.customer_freight_charge ?? '', allocated_freight_cost: f.allocated_freight_cost ?? '',
      pickup_location: f.pickup_location || '', delivery_location: f.delivery_location || '', notes: f.notes || '',
    });
    setEditingFreightOnlyId(f.freight_only_line_id);
    setShowNewFreightOnly(true);
  }
  function updateFreightOnlyForm(changes) {
    const next = { ...freightOnlyForm, ...changes };
    // auto-populate pallets/weight from Product Master whenever a product
    // and case count are both known — still fully editable afterward
    const product = products.find(p => p.product_id === Number(next.product_id));
    if (product && next.cases) {
      const cases = Number(next.cases);
      if (product.cases_per_pallet) next.pallets = String(Math.ceil(cases / product.cases_per_pallet));
      if (product.gross_weight_per_case) next.weight = String(cases * product.gross_weight_per_case);
      if (!next.commodity_description) next.commodity_description = `${product.commodity} — ${product.pack_size}`;
    }
    setFreightOnlyForm(next);
  }
  async function createFreightOnlyOrder() {
    if (!freightOnlyForm.customer_id && !editingFreightOnlyId) { alert('Customer, Commodity Description, and Cases are all required.'); return; }
    if (!freightOnlyForm.commodity_description || !freightOnlyForm.cases) { alert('Commodity Description and Cases are required.'); return; }

    if (editingFreightOnlyId) {
      const original = freightOnlyLines.find(f => f.freight_only_line_id === editingFreightOnlyId);
      const payload = {
        product_id: freightOnlyForm.product_id ? Number(freightOnlyForm.product_id) : null, commodity_description: freightOnlyForm.commodity_description, cases: Number(freightOnlyForm.cases),
        pallets: freightOnlyForm.pallets ? Number(freightOnlyForm.pallets) : null, weight: freightOnlyForm.weight ? Number(freightOnlyForm.weight) : null,
        customer_freight_charge: freightOnlyForm.customer_freight_charge ? Number(freightOnlyForm.customer_freight_charge) : 0,
        allocated_freight_cost: freightOnlyForm.allocated_freight_cost ? Number(freightOnlyForm.allocated_freight_cost) : 0,
        pickup_location: freightOnlyForm.pickup_location || null, delivery_location: freightOnlyForm.delivery_location || null,
        notes: freightOnlyForm.notes || null,
      };
      const { error } = await supabase.from('freight_only_lines').update(payload).eq('freight_only_line_id', editingFreightOnlyId);
      if (error) { alert('Save failed: ' + error.message); return; }
      if (original) {
        await logAmendments('Freight-only order amended', 'Freight Change', [
          { field: 'cases', before: Number(original.cases || 0), after: payload.cases },
          { field: 'customer_freight_charge', before: Number(original.customer_freight_charge || 0), after: payload.customer_freight_charge },
          { field: 'allocated_freight_cost', before: Number(original.allocated_freight_cost || 0), after: payload.allocated_freight_cost },
        ], 'freight_only_lines', editingFreightOnlyId);
      }
      setShowNewFreightOnly(false); setEditingFreightOnlyId(null);
      setFreightOnlyForm({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', commodity_description: '', cases: '', pallets: '', weight: '', customer_freight_charge: '', allocated_freight_cost: '', pickup_location: '', delivery_location: '', notes: '' });
      loadAll();
      return;
    }

    const { data: order, error: orderErr } = await supabase.from('customer_orders').insert({
      acumatica_order_no: freightOnlyForm.acumatica_no || null, customer_id: Number(freightOnlyForm.customer_id),
      customer_po: freightOnlyForm.customer_po || null, order_date: new Date().toISOString().slice(0, 10),
      order_status: 'Open', source: 'Internal', order_type: 'Freight Only',
    }).select().single();
    if (orderErr) { alert('Could not create order: ' + orderErr.message); return; }
    const { error: lineErr } = await supabase.from('freight_only_lines').insert({
      customer_order_id: order.customer_order_id, jacket_id: jacketId, product_id: freightOnlyForm.product_id ? Number(freightOnlyForm.product_id) : null, commodity_description: freightOnlyForm.commodity_description,
      cases: Number(freightOnlyForm.cases), pallets: freightOnlyForm.pallets ? Number(freightOnlyForm.pallets) : null, weight: freightOnlyForm.weight ? Number(freightOnlyForm.weight) : null,
      customer_freight_charge: freightOnlyForm.customer_freight_charge ? Number(freightOnlyForm.customer_freight_charge) : 0,
      allocated_freight_cost: freightOnlyForm.allocated_freight_cost ? Number(freightOnlyForm.allocated_freight_cost) : 0,
      pickup_location: freightOnlyForm.pickup_location || null, delivery_location: freightOnlyForm.delivery_location || null,
      notes: freightOnlyForm.notes || null, status: 'Planned',
    });
    if (lineErr) { alert('Order created, but the freight-only line failed: ' + lineErr.message); return; }
    await logEvent('freight_only_added', `Freight-only: ${freightOnlyForm.cases} cases of ${freightOnlyForm.commodity_description} for ${customers.find(c => c.customer_id === Number(freightOnlyForm.customer_id))?.company} — $${freightOnlyForm.customer_freight_charge || 0} freight charge`);
    setShowNewFreightOnly(false);
    setFreightOnlyForm({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', commodity_description: '', cases: '', pallets: '', weight: '', customer_freight_charge: '', allocated_freight_cost: '', pickup_location: '', delivery_location: '', notes: '' });
    loadAll();
  }
  async function deleteFreightOnlyLine(line) {
    if (!confirm('Delete this freight-only order? This removes it and its customer order entirely.')) return;
    await supabase.from('freight_only_lines').delete().eq('freight_only_line_id', line.freight_only_line_id);
    await supabase.from('customer_orders').delete().eq('customer_order_id', line.customer_order_id);
    loadAll();
  }
  function openEditDemand(ol) { setEditingDemandLineId(ol.order_line_id); setEditDemandCasesValue(ol.cases_ordered ?? ''); }
  async function saveEditDemand(ol) {
    const newCases = Number(editDemandCasesValue);
    if (!newCases || newCases <= 0) { alert('Enter a valid number of cases.'); return; }
    const { error } = await supabase.from('order_lines').update({ cases_ordered: newCases, amended_at: new Date().toISOString() }).eq('order_line_id', ol.order_line_id);
    if (error) { alert('Save failed: ' + error.message); return; }
    await logAmendments('Order quantity amended', newCases >= ol.cases_ordered ? 'Quantity Increase' : 'Quantity Decrease', [{ field: 'cases_ordered', before: Number(ol.cases_ordered || 0), after: newCases }], 'order_lines', ol.order_line_id);
    setEditingDemandLineId(null);
    loadAll();
  }
  async function deleteDemandOrderLine(ol) {
    if (!confirm(`Delete this order line (${ol.products?.commodity} for ${ol.customer_orders?.customers?.company})? This cannot be undone.`)) return;
    const { data: siblingLines } = await supabase.from('order_lines').select('order_line_id').eq('customer_order_id', ol.customer_order_id);
    const { error } = await supabase.from('order_lines').delete().eq('order_line_id', ol.order_line_id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    if ((siblingLines || []).length <= 1) {
      await supabase.from('customer_orders').delete().eq('customer_order_id', ol.customer_order_id);
    }
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
    ], 'jackets', jacketId);
    setEditingDetails(false);
    loadAll();
  }
  // Generic amendment logger — called automatically from every save
  // function below, right after a real edit succeeds. Compares each
  // before/after pair and only writes a row for fields that actually
  // changed. No separate "amendment area" — amending IS editing.
  // PK column name per table — needed so Reverse knows exactly how to
  // write the original value back to the real record.
  const PK_COLUMN = {
    jackets: 'jacket_id', jacket_product_lines: 'jacket_product_line_id', freight_records: 'freight_id',
    order_lines: 'order_line_id', jacket_lines: 'jacket_line_id', stops: 'stop_id', jacket_commodity_loads: 'id',
  };
  function coerceValue(raw, sampleAfter) {
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof sampleAfter === 'number') { const n = Number(raw); return Number.isNaN(n) ? raw : n; }
    return raw;
  }
  async function logAmendments(amendmentName, amendmentType, diffs, targetTable, targetRecordId) {
    const rows = diffs
      .filter(d => String(d.before ?? '') !== String(d.after ?? ''))
      .map(d => {
        const numeric = typeof d.before === 'number' && typeof d.after === 'number';
        return {
          jacket_id: jacketId, target_table: targetTable, target_record_id: targetRecordId != null ? String(targetRecordId) : null,
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
    if (!confirm(`Reverse "${a.amendment_name}"? This writes the original value back and creates a new amendment recording the reversal — nothing gets deleted.`)) return;
    if (a.target_table && a.target_record_id && PK_COLUMN[a.target_table]) {
      const value = coerceValue(a.original_value, a.new_effective_value);
      const { error: writeErr } = await supabase.from(a.target_table).update({ [a.target_field]: value }).eq(PK_COLUMN[a.target_table], a.target_record_id);
      if (writeErr) { alert('Reversal failed to update the real record: ' + writeErr.message); return; }
    } else {
      alert('This is an older amendment logged before reversal could write back to the real record — the ledger entry below will still be created, but you\'ll need to fix the value manually.');
    }
    const { data: reversal, error } = await supabase.from('amendments').insert({
      jacket_id: jacketId, target_table: a.target_table, target_record_id: a.target_record_id, amendment_name: `Reversal — ${a.amendment_name}`, amendment_type: a.amendment_type, target_field: a.target_field,
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
    if (!confirm(`Permanently delete Jacket ${jacket.jacket_number}? This removes everything tied to it — purchased product, allocations, stops, freight, and its Timeline. Any Claims logged against it are kept as history (their link to this Jacket is just cleared). This cannot be undone.`)) return;
    if (!confirm('Really sure? Type OK to confirm one more time — this is permanent.')) return;
    // stops, jacket_lines, stop_lines, purchased product, freight, freight-only
    // lines, amendments, events, and documents all cascade automatically now —
    // deleting the jacket itself is enough.
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
  async function saveAdjustment() {
    if (!adjustmentForm.adjustment_type || !adjustmentForm.amount) { alert('Type and Amount are required.'); return; }
    const { error } = await supabase.from('financial_adjustments').insert({
      jacket_id: jacketId, adjustment_type: adjustmentForm.adjustment_type, description: adjustmentForm.description || null,
      amount: Number(adjustmentForm.amount), direction: adjustmentForm.direction,
      adjustment_date: adjustmentForm.adjustment_date || new Date().toISOString().slice(0, 10),
      notes: adjustmentForm.notes || null, created_by: userEmail,
    });
    if (error) { alert('Save failed: ' + error.message); return; }
    await logEvent('financial_adjustment_added', `${adjustmentForm.direction === 'Revenue' ? '+' : '-'}$${Number(adjustmentForm.amount).toLocaleString()} — ${adjustmentForm.adjustment_type}${adjustmentForm.description ? ': ' + adjustmentForm.description : ''}`);
    setShowAddAdjustment(false);
    setAdjustmentForm({ adjustment_type: 'Other', description: '', amount: '', direction: 'Cost', adjustment_date: '', notes: '' });
    loadAll();
  }
  async function deleteAdjustment(a) {
    if (!confirm(`Remove this adjustment (${a.adjustment_type}, $${Number(a.amount).toLocaleString()})? This cannot be undone.`)) return;
    const { error } = await supabase.from('financial_adjustments').delete().eq('adjustment_id', a.adjustment_id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }

  async function saveSupplierPayment() {
    const payload = { ...paymentForm, supplier_amount_paid: paymentForm.supplier_amount_paid ? Number(paymentForm.supplier_amount_paid) : 0 };
    const { error } = await supabase.from('jackets').update(payload).eq('jacket_id', jacketId);
    if (error) { alert('Save failed: ' + error.message); return; }
    await logAmendments('Supplier payment amended', 'Credit', [
      { field: 'supplier_payment_status', before: jacket.supplier_payment_status || 'Unpaid', after: payload.supplier_payment_status },
      { field: 'supplier_amount_paid', before: jacket.supplier_amount_paid != null ? Number(jacket.supplier_amount_paid) : 0, after: payload.supplier_amount_paid },
    ], 'jackets', jacketId);
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
  async function deleteFreight() {
    if (!freight) return;
    if (!confirm('Delete this freight record? This removes the carrier/rate info entirely — you can re-add it later.')) return;
    const { error } = await supabase.from('freight_records').delete().eq('freight_id', freight.freight_id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    await logEvent('freight_deleted', `Freight record deleted — was ${freight.carrier}, $${Number(freight.booked_rate || 0).toLocaleString()}`);
    loadAll();
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
      ], 'freight_records', freight.freight_id);
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
    await logAmendments('Stop number changed', 'Stop Change', [{ field: 'stop_number', before: old?.stop_number ?? null, after: Number(newNumber) }], 'stops', stopId);
    loadAll();
  }
  async function updateAppointment(stopId, value) {
    const old = stops.find(s => s.stop_id === stopId);
    const newVal = value ? new Date(value).toISOString() : null;
    const { error } = await supabase.from('stops').update({ appointment: newVal }).eq('stop_id', stopId);
    if (error) { alert('Update failed: ' + error.message); return; }
    await logAmendments('Appointment changed', 'Delivery Date Change', [{ field: 'appointment', before: old?.appointment || null, after: newVal }], 'stops', stopId);
    loadAll();
  }

  // ---- Load Tracking: jacket-level actual loaded, by commodity/shipper ----
  async function updateCommodityLoad(productId, supplierId, value) {
    const existing = commodityLoads.find(c => c.product_id === productId && c.supplier_id === supplierId);
    let error, recordId = existing?.id;
    if (existing) {
      ({ error } = await supabase.from('jacket_commodity_loads').update({ actual_cases_loaded: value }).eq('id', existing.id));
    } else {
      const { data: created, error: insertErr } = await supabase.from('jacket_commodity_loads').insert({ jacket_id: jacketId, product_id: productId, supplier_id: supplierId, actual_cases_loaded: value }).select().single();
      error = insertErr;
      recordId = created?.id;
    }
    if (error) { alert('Update failed: ' + error.message); return; }
    await logAmendments('Actual cases loaded changed', 'Quantity Increase', [{ field: 'actual_cases_loaded', before: existing?.actual_cases_loaded != null ? Number(existing.actual_cases_loaded) : null, after: value }], 'jacket_commodity_loads', recordId);
    loadAll();
  }
  async function checkAutoJacketStatus() {
    const { data: lines } = await supabase.from('jacket_lines').select('load_status').eq('jacket_id', jacketId);
    const relevantLines = (lines || []).filter(l => l.load_status);
    if (relevantLines.length === 0) return;
    const allDelivered = relevantLines.every(l => l.load_status === 'Delivered');
    if (allDelivered && !['Delivered', 'Closed', 'Cancelled'].includes(jacket.jacket_status)) {
      await supabase.from('jackets').update({ jacket_status: 'Delivered' }).eq('jacket_id', jacketId);
      await logEvent('status_auto_updated', 'Jacket status auto-updated to Delivered — every load is now delivered');
    }
  }
  async function updateJacketLineField(id, fieldName, value) {
    const old = jacketLines.find(l => l.jacket_line_id === id);
    const { error } = await supabase.from('jacket_lines').update({ [fieldName]: value, updated_at: new Date().toISOString() }).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    const typeMap = { load_status: 'Stop Change', bol_number: 'Note' };
    await logAmendments(`${fieldName === 'bol_number' ? 'BOL #' : 'Load status'} changed`, typeMap[fieldName] || 'Other', [{ field: fieldName, before: old?.[fieldName] ?? null, after: value }], 'jacket_lines', id);
    if (fieldName === 'load_status') {
      if (value === 'Delivered' && old?.order_line_id) {
        const { data: ol } = await supabase.from('order_lines').select('line_status').eq('order_line_id', old.order_line_id).maybeSingle();
        if (ol && ol.line_status === 'Open') await supabase.from('order_lines').update({ line_status: 'Delivered' }).eq('order_line_id', old.order_line_id);
      }
      await checkAutoJacketStatus();
    }
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
    if (type === 'Delivered') {
      const line = jacketLines.find(l => l.jacket_line_id === jacketLineId);
      if (line && line.load_status !== 'Delivered') {
        await supabase.from('jacket_lines').update({ load_status: 'Delivered', updated_at: new Date().toISOString() }).eq('jacket_line_id', jacketLineId);
        await logAmendments('Load status auto-updated', 'Stop Change', [{ field: 'load_status', before: line.load_status, after: 'Delivered' }], 'jacket_lines', jacketLineId);
        if (line.order_line_id && line.order_lines?.line_status === 'Open') {
          await supabase.from('order_lines').update({ line_status: 'Delivered' }).eq('order_line_id', line.order_line_id);
        }
        await checkAutoJacketStatus();
      }
    }
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
    await logAmendments('Delivered quantity changed', old && Number(value) >= Number(old.actual_cases_delivered || 0) ? 'Overage' : 'Shortage', [{ field: 'actual_cases_delivered', before: old?.actual_cases_delivered != null ? Number(old.actual_cases_delivered) : 0, after: Number(value) }], 'jacket_lines', id);
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
    const fromLabel = line.order_lines?.customer_orders?.acumatica_order_no || `line ${line.order_line_id}`;
    const toLabel = newOrder?.customer_orders?.acumatica_order_no || `line ${reassignTarget}`;
    await logAmendments(`Reassigned from ${fromLabel} to ${toLabel}`, 'Customer Change', [{ field: 'order_line_id', before: line.order_line_id, after: Number(reassignTarget) }], 'jacket_lines', line.jacket_line_id);
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
    setResolveForm({ status: claim.status === 'Open' ? 'Resolved' : claim.status, resolution: claim.resolution || '', price_adjustment: claim.resolution_price_adjustment || '', new_cases_ordered: '', jacket_line_id: claim.jacket_line_id || '' });
    setResolvingId(claim.claim_id);
  }
  function openEditClaim(claim) {
    setEditClaimForm({ claim_type: claim.claim_type, description: claim.description || '' });
    setEditingClaimId(claim.claim_id);
  }
  async function saveEditClaim(claim) {
    if (!editClaimForm.description) { alert('Description is required.'); return; }
    const { error } = await supabase.from('claims').update({ claim_type: editClaimForm.claim_type, description: editClaimForm.description }).eq('claim_id', claim.claim_id);
    if (error) { alert('Save failed: ' + error.message); return; }
    setEditingClaimId(null);
    loadAll();
  }
  async function deleteClaim(claimId) {
    if (!confirm('Delete this claim? This cannot be undone.')) return;
    const { error } = await supabase.from('claims').delete().eq('claim_id', claimId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }
  function availableForLine(jacketLineId) {
    const relevant = caseDispositions.filter(d => d.jacket_line_id === jacketLineId);
    const rejected = relevant.filter(d => d.disposition_type === 'Rejected').reduce((s, d) => s + Number(d.cases), 0);
    const reassigned = relevant.filter(d => d.disposition_type === 'Reassigned').reduce((s, d) => s + Number(d.cases), 0);
    const dumped = relevant.filter(d => d.disposition_type === 'Dumped').reduce((s, d) => s + Number(d.cases), 0);
    return { rejected, reassigned, dumped, available: rejected - reassigned - dumped };
  }
  function openMarkRejected(claim) {
    const line = jacketLines.find(l => l.jacket_line_id === claim.jacket_line_id);
    setRejectForm({ cases: line ? String(line.cases_to_load) : '', notes: '' });
    setRejectingClaimId(claim.claim_id);
  }
  async function saveMarkRejected(claim) {
    const line = jacketLines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) { alert('This claim has no jacket line attached.'); return; }
    const cases = Number(rejectForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many cases were rejected.'); return; }
    if (cases > Number(line.cases_to_load)) { alert(`Only ${line.cases_to_load} cases are on this allocation.`); return; }
    const { error } = await supabase.from('case_dispositions').insert({
      jacket_line_id: line.jacket_line_id, claim_id: claim.claim_id, disposition_type: 'Rejected',
      cases, notes: rejectForm.notes || null, created_by: userEmail,
    });
    if (error) { alert('Failed: ' + error.message); return; }
    const fullReject = cases >= Number(line.cases_to_load);
    if (line.order_line_id) {
      await supabase.from('order_lines').update({ line_status: fullReject ? 'Rejected' : 'Shorted' }).eq('order_line_id', line.order_line_id);
    }
    await logEvent('cases_rejected', `${cases} cases marked rejected — ${line.order_lines?.products?.commodity}`);
    setRejectingClaimId(null);
    setRejectForm({ cases: '', notes: '' });
    loadAll();
  }

  // ---- Reassign Cases: 3-option picker ----
  function openReassignPicker(claim) {
    const line = jacketLines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) { alert('This claim has no jacket line attached.'); return; }
    const { available } = availableForLine(line.jacket_line_id);
    setReassignPickerFor({ claimId: claim.claim_id, jacketLineId: line.jacket_line_id, available });
    setReassignMode(null);
    setReassignReason('Rejected Product Reassignment');
    setAssignExistingForm({ order_line_id: '', cases: '' });
    setNewOrderFromRejectForm({ customer_id: '', cases: '', sell_price_per_case: '', customer_po: '' });
  }
  function closeReassignPicker() { setReassignPickerFor(null); setReassignMode(null); }
  async function chooseReassignMode(mode) {
    setReassignMode(mode);
    if (mode === 'existing' || mode === 'allocation') {
      const line = jacketLines.find(l => l.jacket_line_id === reassignPickerFor.jacketLineId);
      const { data } = await supabase
        .from('order_lines').select('order_line_id, cases_ordered, customer_orders(acumatica_order_no, order_status, customers(company))')
        .eq('product_id', line?.order_lines?.product_id).neq('order_line_id', line?.order_line_id);
      setAssignExistingOptions((data || []).filter(ol => ol.customer_orders?.order_status === 'Open'));
      setReassignReason(mode === 'existing' ? 'Rejected Product Reassignment' : 'Operational Correction');
    }
  }
  async function saveAssignExisting() {
    const line = jacketLines.find(l => l.jacket_line_id === reassignPickerFor.jacketLineId);
    if (!line) return;
    const cases = Number(assignExistingForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many cases to move.'); return; }
    if (cases > reassignPickerFor.available) { alert(`Only ${reassignPickerFor.available} cases are available.`); return; }
    if (!assignExistingForm.order_line_id) { alert('Pick which order.'); return; }
    const { data: newLine, error: insertErr } = await supabase.from('jacket_lines').insert({
      jacket_id: line.jacket_id, order_line_id: Number(assignExistingForm.order_line_id), jacket_product_line_id: line.jacket_product_line_id,
      allocated_cost_per_case: line.allocated_cost_per_case, planned_cases: cases, cases_to_load: cases, actual_cases_loaded: 0, actual_cases_delivered: 0,
      load_status: 'Planned', quantity_updated_at: new Date().toISOString(),
    }).select().single();
    if (insertErr) { alert('Move failed: ' + insertErr.message); return; }
    await supabase.from('case_dispositions').insert({
      jacket_line_id: line.jacket_line_id, claim_id: reassignPickerFor.claimId, disposition_type: 'Reassigned',
      cases, reason: reassignReason, target_order_line_id: Number(assignExistingForm.order_line_id), target_jacket_line_id: newLine.jacket_line_id,
      created_by: userEmail,
    });
    await logEvent('cases_reassigned', `${cases} cases reassigned to a different order — ${reassignReason}`);
    closeReassignPicker();
    loadAll();
  }
  async function saveCreateNewOrderFromReject() {
    const line = jacketLines.find(l => l.jacket_line_id === reassignPickerFor.jacketLineId);
    if (!line) return;
    const cases = Number(newOrderFromRejectForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many cases.'); return; }
    if (cases > reassignPickerFor.available) { alert(`Only ${reassignPickerFor.available} cases are available.`); return; }
    if (!newOrderFromRejectForm.customer_id) { alert('Pick a customer.'); return; }
    const { data: newOrder, error: orderErr } = await supabase.from('customer_orders').insert({
      customer_id: Number(newOrderFromRejectForm.customer_id), customer_po: newOrderFromRejectForm.customer_po || null,
      order_date: new Date().toISOString().slice(0, 10), order_status: 'Open', source: 'Internal', order_type: 'Produce Sale',
    }).select().single();
    if (orderErr) { alert('Could not create order: ' + orderErr.message); return; }
    const sell = newOrderFromRejectForm.sell_price_per_case ? Number(newOrderFromRejectForm.sell_price_per_case) : null;
    const { data: newOrderLine, error: lineErr } = await supabase.from('order_lines').insert({
      customer_order_id: newOrder.customer_order_id, product_id: line.order_lines?.product_id, cases_ordered: cases,
      original_cases_ordered: cases, sell_price_per_case: sell, original_sell_price_per_case: sell, fob_cost_per_case: line.allocated_cost_per_case,
      pricing_type: 'FOB', line_status: 'Open',
    }).select().single();
    if (lineErr) { alert('Order created, but the line failed: ' + lineErr.message); return; }
    const { data: newJacketLine, error: jlErr } = await supabase.from('jacket_lines').insert({
      jacket_id: line.jacket_id, order_line_id: newOrderLine.order_line_id, jacket_product_line_id: line.jacket_product_line_id,
      allocated_cost_per_case: line.allocated_cost_per_case, planned_cases: cases, cases_to_load: cases, actual_cases_loaded: 0, actual_cases_delivered: 0,
      load_status: 'Planned', quantity_updated_at: new Date().toISOString(),
    }).select().single();
    if (jlErr) { alert('Order and line created, but allocation failed: ' + jlErr.message); return; }
    await supabase.from('case_dispositions').insert({
      jacket_line_id: line.jacket_line_id, claim_id: reassignPickerFor.claimId, disposition_type: 'Reassigned',
      cases, reason: 'Rejected Product Reassignment', target_order_line_id: newOrderLine.order_line_id, target_jacket_line_id: newJacketLine.jacket_line_id,
      created_by: userEmail,
    });
    await logEvent('new_order_from_rejected', `Created a new order for ${cases} reassigned cases — ${line.order_lines?.products?.commodity}`);
    closeReassignPicker();
    loadAll();
  }

  // ---- Dump Cases ----
  function openDumpCases(claim) {
    const line = jacketLines.find(l => l.jacket_line_id === claim.jacket_line_id);
    if (!line) { alert('This claim has no jacket line attached.'); return; }
    const { available } = availableForLine(line.jacket_line_id);
    setShowDumpFor({ claimId: claim.claim_id, jacketLineId: line.jacket_line_id, available });
    setDumpForm({ cases: '', dump_date: new Date().toISOString().slice(0, 10), reason: 'Quality/Condition', dump_fee: '', notes: '' });
  }
  async function saveDumpCases() {
    const cases = Number(dumpForm.cases);
    if (!cases || cases <= 0) { alert('Enter how many cases were dumped.'); return; }
    if (cases > showDumpFor.available) { alert(`Only ${showDumpFor.available} cases are available.`); return; }
    const { error } = await supabase.from('case_dispositions').insert({
      jacket_line_id: showDumpFor.jacketLineId, claim_id: showDumpFor.claimId, disposition_type: 'Dumped',
      cases, reason: dumpForm.reason, dump_fee: dumpForm.dump_fee ? Number(dumpForm.dump_fee) : null,
      notes: dumpForm.notes || null, created_by: userEmail,
    });
    if (error) { alert('Failed: ' + error.message); return; }
    await logEvent('cases_dumped', `${cases} cases dumped — ${dumpForm.reason}`);
    setShowDumpFor(null);
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

    const lineId = newJacketLineId || claim.jacket_line_id;
    const line = jacketLines.find(l => l.jacket_line_id === lineId);
    const ol = line?.order_lines || claim.jacket_lines?.order_lines;
    const orderLineId = ol?.order_line_id || claim.jacket_lines?.order_lines?.order_line_id;

    if (adjustment && ol && orderLineId) {
      const newPrice = Number(ol.sell_price_per_case) + adjustment;
      const { error: priceError } = await supabase.from('order_lines').update({ sell_price_per_case: newPrice }).eq('order_line_id', orderLineId);
      if (priceError) alert('Claim saved, but price update failed: ' + priceError.message);
      else await logAmendments('Claim price adjustment', newPrice >= Number(ol.sell_price_per_case) ? 'Price Increase' : 'Price Decrease', [{ field: 'sell_price_per_case', before: Number(ol.sell_price_per_case), after: newPrice }], 'order_lines', orderLineId);
    }
    if (resolveForm.new_cases_ordered && ol && orderLineId) {
      const newCases = Number(resolveForm.new_cases_ordered);
      const { error: casesError } = await supabase.from('order_lines').update({ cases_ordered: newCases, amended_at: new Date().toISOString() }).eq('order_line_id', orderLineId);
      if (casesError) alert('Claim saved, but cases update failed: ' + casesError.message);
      else await logAmendments('Claim quantity adjustment', newCases >= Number(ol.cases_ordered || 0) ? 'Overage' : 'Shortage', [{ field: 'cases_ordered', before: Number(ol.cases_ordered || 0), after: newCases }], 'order_lines', orderLineId);
    }
    await logEvent('claim_resolved', `Claim resolved — ${resolveForm.status}${adjustment ? `, price adjusted ${adjustment >= 0 ? '+' : ''}$${adjustment}` : ''}${resolveForm.new_cases_ordered ? `, cases now ${resolveForm.new_cases_ordered}` : ''}`);
    setResolvingId(null);
    loadAll();
  }

  if (!jacket) return <AppShell title="Jacket"><p style={{ color: 'var(--fo-text-faint)' }}>Loading…</p></AppShell>;

  const totalPallets = purchasedLines.reduce((s, p) => s + (p.products?.cases_per_pallet ? Math.ceil((p.actual_cases_received ?? p.purchased_cases) / p.products.cases_per_pallet) : 0), 0)
    + freightOnlyLines.reduce((s, f) => s + Number(f.pallets || 0), 0);
  const totalWeight = purchasedLines.reduce((s, p) => s + (p.products?.gross_weight_per_case || 0) * (p.actual_cases_received ?? (p.purchased_cases || 0)), 0)
    + freightOnlyLines.reduce((s, f) => s + Number(f.weight || 0), 0);
  const orderCount = new Set(jacketLines.map(l => l.order_lines?.customer_orders?.acumatica_order_no).filter(Boolean)).size;
  const estRevenue = jacketLines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.order_lines?.sell_price_per_case || 0), 0);
  const estCost = jacketLines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.allocated_cost_per_case || 0), 0);
  const freightCost = freight ? Number(freight.booked_rate || 0) + Number(freight.extra_fees || 0) : 0;
  const estProfit = estRevenue - estCost - freightCost;
  const weightCapacity = jacket.weight_capacity || 42500;
  const palletCapacity = jacket.pallet_capacity || 24;
  const overWeight = totalWeight > weightCapacity;
  const overPallets = totalPallets > palletCapacity;
  const freightOnlyRevenue = freightOnlyLines.reduce((s, f) => s + Number(f.customer_freight_charge || 0), 0);
  const freightOnlyCost = freightOnlyLines.reduce((s, f) => s + Number(f.allocated_freight_cost || 0), 0);
  const freightOnlyProfit = freightOnlyRevenue - freightOnlyCost;

  // ---- Expanded Financials computations — all derived from real data,
  // nothing fabricated. Product Sales Detail: one row per allocation on
  // this Jacket. ----
  const productSalesRows = jacketLines.filter(l => l.jacket_product_line_id).map(l => {
    const cases = Number(l.cases_to_load || 0);
    const sell = Number(l.order_lines?.sell_price_per_case || 0);
    const cost = Number(l.allocated_cost_per_case || 0);
    const revenue = cases * sell;
    const lineCost = cases * cost;
    const profit = revenue - lineCost;
    return {
      key: l.jacket_line_id, customer: l.order_lines?.customer_orders?.customers?.company, orderNo: l.order_lines?.customer_orders?.acumatica_order_no,
      commodity: l.order_lines?.products?.commodity, packSize: l.order_lines?.products?.pack_size, cases, sell, revenue, cost, lineCost, profit,
      margin: revenue ? (profit / revenue) * 100 : 0,
    };
  });

  const supplierFeesTotal = jacketLines.filter(l => l.jacket_product_line_id).reduce((s, l) => {
    const purchased = purchasedLines.find(p => p.jacket_product_line_id === l.jacket_product_line_id);
    return s + Number(l.cases_to_load || 0) * Number(purchased?.fee_total_per_case || 0);
  }, 0);
  const baseCostTotal = estCost - supplierFeesTotal;

  // Claims impact — real dollar effect of price adjustments already
  // applied to allocations on this jacket (resolved claims only)
  const claimsImpact = claims.reduce((s, c) => {
    if (!c.resolution_price_adjustment) return s;
    const line = jacketLines.find(l => l.jacket_line_id === c.jacket_line_id);
    const cases = line ? Number(line.cases_to_load || 0) : 0;
    return s + Number(c.resolution_price_adjustment) * cases;
  }, 0);

  const adjustmentsRevenue = financialAdjustments.filter(a => a.direction === 'Revenue').reduce((s, a) => s + Number(a.amount || 0), 0);
  const adjustmentsCost = financialAdjustments.filter(a => a.direction === 'Cost').reduce((s, a) => s + Number(a.amount || 0), 0);
  const adjustmentsNet = adjustmentsRevenue - adjustmentsCost;

  const totalRevenue = estRevenue + freightOnlyRevenue + adjustmentsRevenue;
  const totalCost = estCost + freightCost + adjustmentsCost;
  const totalProfit = totalRevenue - totalCost;
  const totalMarginPct = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0;

  // Financial Readiness — real status checks, informational only
  const readinessItems = [
    { label: 'Supplier Settled', ok: jacket.supplier_payment_status === 'Paid' },
    { label: 'Carrier Paid', ok: !!freight?.carrier_paid },
    { label: 'Freight Booked', ok: !!freight },
    { label: 'Claims Resolved', ok: claims.every(c => c.status === 'Resolved') },
    { label: 'Final Cost Entered (Received Cases)', ok: purchasedLines.every(p => p.actual_cases_received != null) },
  ];

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

  // ---- Route Progress — derived from real load_status data, never the
  // dormant stops.status field. A stop is Completed once every case tied
  // to it has moved past "Planned" (pickup) or reached a final delivery
  // outcome (delivery). The first non-completed stop, in real stop order,
  // is Current; everything after it is Upcoming. ----
  let foundCurrent = false;
  const routeStops = stops.map(s => {
    const linesOnStop = (s.stop_lines || []).map(sl => sl.jacket_lines).filter(Boolean);
    const casesAtStop = (s.stop_lines || []).reduce((sum, sl) => sum + Number(sl.cases_at_stop || 0), 0);
    const isCompleted = linesOnStop.length > 0 && (
      s.stop_type === 'Pickup'
        ? linesOnStop.every(jl => jl.load_status && jl.load_status !== 'Planned')
        : linesOnStop.every(jl => ['Delivered', 'Short', 'Exception'].includes(jl.load_status))
    );
    let state;
    if (isCompleted) state = 'Completed';
    else if (!foundCurrent) { state = 'Current'; foundCurrent = true; }
    else state = 'Upcoming';
    return { ...s, routeState: state, casesAtStop };
  });

  const timelinePanelContent = (
    <>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 10 }}>Timeline / Activity</div>
      {amendments.length > 0 && (
        <div style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--fo-border-soft)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Amendments</div>
          {amendments.map(a => (
            <div key={a.amendment_id} style={{ fontSize: 11.5, padding: '5px 0', borderBottom: '1px solid var(--fo-border-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0 }}>
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
    </>
  );

  return (
    <AppShell title={`Jacket ${jacket.jacket_number}`} subtitle={jacket.jacket_status}>
      <div className="no-print" style={{ marginBottom: 16 }}>
        <a href="/app/jackets" style={{ fontSize: 13, color: 'var(--fo-text-dim)', textDecoration: 'none' }}>← All Jackets</a>
      </div>

      {needs.length > 0 && (
        <div className="fo-card fo-card-tight no-print" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fo-text-dim)' }}>Cases Still Needed — across all open orders</div>
            <div>
              <a href="/app/ordering-needs" style={{ fontSize: 12, color: 'var(--fo-info)', marginRight: 12, textDecoration: 'none' }}>See which orders →</a>
              <button onClick={() => setShowNeeds(!showNeeds)} className="fo-btn fo-btn-secondary fo-btn-sm">{showNeeds ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          {showNeeds && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
              {needs.map((n, i) => (
                <div key={i} className="fo-badge fo-badge-amber" style={{ fontSize: 12.5, padding: '5px 12px' }}>
                  <strong>{n.needed.toLocaleString()}</strong>&nbsp;{n.commodity} — {n.packSize}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Header ---- */}
      <div className="fo-card no-print" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Stat label="Pallets" value={`${totalPallets} / ${palletCapacity}`} tone={overPallets ? 'red' : undefined} />
            <Stat label="Weight" value={`${totalWeight.toLocaleString()} / ${weightCapacity.toLocaleString()} lb`} tone={overWeight ? 'red' : undefined} />
            <Stat label="Products" value={purchasedLines.length} />
            <Stat label="Orders" value={orderCount} />
            <Stat label="Est. Revenue" value={`$${estRevenue.toLocaleString()}`} />
            <Stat label="Est. Profit" value={`$${estProfit.toLocaleString()}`} tone={estProfit >= 0 ? 'green' : 'red'} />
            {claims.length > 0 && <Stat label="Open Claims" value={claims.length} tone="red" />}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <button onClick={() => setShowActivityDrawer(true)} className="fo-btn fo-btn-secondary fo-btn-sm fo-activity-btn">Activity{events.length > 0 ? ` (${events.length})` : ''}</button>
            <button onClick={closeJacket} className="fo-btn fo-btn-secondary fo-btn-sm">Close Jacket</button>
            <button onClick={deleteJacketEntirely} className="fo-btn fo-btn-danger fo-btn-sm">Delete Jacket</button>
          </div>
        </div>
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--fo-border-soft)' }}>
          <ProgressBar label="Pallet Capacity" current={totalPallets} max={palletCapacity} />
          <ProgressBar label="Weight Capacity" current={totalWeight} max={weightCapacity} unit=" lb" />
        </div>
      </div>

      {/* ---- Tabs + Timeline layout ---- */}
      <div className="tabs-timeline-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 0.85fr', gap: 16, alignItems: 'start' }}>
        <div>
          <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} className="fo-btn fo-btn-sm"
                style={{ background: activeTab === t ? 'var(--fo-primary)' : 'var(--fo-card-bg)', color: activeTab === t ? '#fff' : 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'Overview' && (
            <OverviewTab jacket={jacket} purchasedLines={purchasedLines} allJacketLinesGlobal={allJacketLinesGlobal} jacketLines={jacketLines} claims={claims} freight={freight} availableOnPurchased={availableOnPurchased} totalWeight={totalWeight} totalPallets={totalPallets} weightCapacity={weightCapacity} palletCapacity={palletCapacity}
              estRevenue={estRevenue} freightOnlyRevenue={freightOnlyRevenue} adjustmentsRevenue={adjustmentsRevenue} baseCostTotal={baseCostTotal} supplierFeesTotal={supplierFeesTotal} freightCost={freightCost} adjustmentsCost={adjustmentsCost} totalRevenue={totalRevenue} totalCost={totalCost} totalProfit={totalProfit} totalMarginPct={totalMarginPct}
              routeStops={routeStops} commodityLoads={commodityLoads} />
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
                      <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <ProductIcon commodity={p.products?.commodity} size={26} />
                        <div>
                          <strong>{p.products?.commodity} — {p.products?.pack_size}</strong> · {p.suppliers?.company || 'no supplier set'} {p.shipper_po ? `· PO ${p.shipper_po}` : ''}
                          <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginTop: 2 }}>
                            Purchased {p.purchased_cases}{p.actual_cases_received != null ? ` · Received ${p.actual_cases_received}` : ''} · Allocated {allocated} · <strong style={{ color: available > 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>Available {available}</strong> · ${Number(p.purchase_cost_per_case || 0).toFixed(2)}/cs
                          </div>
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
                    <select value={purchasedForm.supplier_id} onChange={e => {
                      const sup = suppliers.find(s => String(s.supplier_id) === e.target.value);
                      setPurchasedForm({ ...purchasedForm, supplier_id: e.target.value, fee_total_per_case: purchasedForm.fee_total_per_case || sup?.per_case_fee || '' });
                    }} style={{ display: 'block', width: '100%', marginTop: 4 }}>
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
                  <div>
                    <button onClick={() => setShowNewOrder(!showNewOrder)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-primary)', color: '#fff' }}>+ New Order</button>{' '}
                    <button onClick={() => { setEditingFreightOnlyId(null); setFreightOnlyForm({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', commodity_description: '', cases: '', pallets: '', weight: '', customer_freight_charge: '', allocated_freight_cost: '', pickup_location: '', delivery_location: '', notes: '' }); setShowNewFreightOnly(!showNewFreightOnly); }} className="fo-btn fo-btn-secondary fo-btn-sm">+ Freight Only</button>
                  </div>
                </div>
                {showNewFreightOnly && (
                  <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                    {editingFreightOnlyId ? (
                      <div style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--fo-text-dim)' }}>Editing existing freight-only order — customer can't be changed here; delete and re-add if that's what's wrong.</div>
                    ) : (
                      <label style={{ fontSize: 13 }}><span className="fo-field-label">Customer</span>
                        <select value={freightOnlyForm.customer_id} onChange={e => setFreightOnlyForm({ ...freightOnlyForm, customer_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                          <option value="">— select —</option>
                          {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.company}</option>)}
                        </select>
                      </label>
                    )}
                    {textField('Acumatica Order # (optional)', freightOnlyForm.acumatica_no, v => setFreightOnlyForm({ ...freightOnlyForm, acumatica_no: v }))}
                    {textField('Customer PO', freightOnlyForm.customer_po, v => setFreightOnlyForm({ ...freightOnlyForm, customer_po: v }))}
                    <label style={{ fontSize: 13 }}><span className="fo-field-label">Product (optional — auto-fills pallets/weight)</span>
                      <select value={freightOnlyForm.product_id} onChange={e => updateFreightOnlyForm({ product_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        <option value="">— not tracked as a product —</option>
                        {products.map(pr => <option key={pr.product_id} value={pr.product_id}>{pr.commodity} — {pr.pack_size}</option>)}
                      </select>
                    </label>
                    {textField('Commodity Description', freightOnlyForm.commodity_description, v => setFreightOnlyForm({ ...freightOnlyForm, commodity_description: v }))}
                    {textField('Cases', freightOnlyForm.cases, v => updateFreightOnlyForm({ cases: v }), 'number')}
                    {textField('Pallets', freightOnlyForm.pallets, v => setFreightOnlyForm({ ...freightOnlyForm, pallets: v }), 'number')}
                    {textField('Weight (lb)', freightOnlyForm.weight, v => setFreightOnlyForm({ ...freightOnlyForm, weight: v }), 'number')}
                    {textField('Customer Freight Charge ($)', freightOnlyForm.customer_freight_charge, v => setFreightOnlyForm({ ...freightOnlyForm, customer_freight_charge: v }), 'number')}
                    {textField('Allocated Freight Cost ($)', freightOnlyForm.allocated_freight_cost, v => setFreightOnlyForm({ ...freightOnlyForm, allocated_freight_cost: v }), 'number')}
                    {textField('Pickup Location', freightOnlyForm.pickup_location, v => setFreightOnlyForm({ ...freightOnlyForm, pickup_location: v }))}
                    {textField('Delivery Location', freightOnlyForm.delivery_location, v => setFreightOnlyForm({ ...freightOnlyForm, delivery_location: v }))}
                    <div style={{ gridColumn: '1 / -1' }}>{textField('Notes', freightOnlyForm.notes, v => setFreightOnlyForm({ ...freightOnlyForm, notes: v }))}</div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <button onClick={createFreightOnlyOrder} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>{editingFreightOnlyId ? 'Update Freight-Only Order' : 'Save Freight-Only Order'}</button>
                      <button onClick={() => { setShowNewFreightOnly(false); setEditingFreightOnlyId(null); }} className="fo-btn fo-btn-secondary">Cancel</button>
                    </div>
                    <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--fo-text-faint)' }}>This is customer-owned product riding on your truck for a fee — it doesn't touch your purchased product or count as a produce sale anywhere.</div>
                  </div>
                )}
                {freightOnlyLines.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    {freightOnlyLines.map(f => (
                      <div key={f.freight_only_line_id} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 13.5 }}>
                          <span className="fo-badge fo-badge-blue" style={{ marginRight: 6 }}>Freight Only</span>
                          <strong>{f.customer_orders?.customers?.company}</strong> — {f.cases} cases of {f.commodity_description}
                          <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{f.pallets ? `${f.pallets} pallets · ` : ''}{f.weight ? `${f.weight} lb · ` : ''}${Number(f.customer_freight_charge || 0).toLocaleString()} freight charge</div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <button onClick={() => openEditFreightOnly(f)} className="fo-btn fo-btn-secondary fo-btn-sm">Edit</button>{' '}
                          <button onClick={() => deleteFreightOnlyLine(f)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                            <div style={{ fontSize: 13.5, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <ProductIcon commodity={ol.products?.commodity} size={22} />
                              <div>
                                <strong>{ol.customer_orders?.customers?.company}</strong> — {ol.customer_orders?.acumatica_order_no || 'no Acumatica #'}
                                <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{ol.products?.commodity} — {ol.products?.pack_size} · needs {ol.needsSupply}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={() => openDemandAllocate(ol.order_line_id, matchingPurchased)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Allocate</button>
                              <button onClick={() => openEditDemand(ol)} className="fo-btn fo-btn-secondary fo-btn-sm">Edit</button>
                              <button onClick={() => deleteDemandOrderLine(ol)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                            </div>
                          </div>
                          {editingDemandLineId === ol.order_line_id && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                              <label style={{ fontSize: 12 }}>Cases Ordered<input type="number" value={editDemandCasesValue} onChange={e => setEditDemandCasesValue(e.target.value)} style={{ display: 'block', width: 90, marginTop: 2 }} /></label>
                              <button onClick={() => saveEditDemand(ol)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Save</button>
                              <button onClick={() => setEditingDemandLineId(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                            </div>
                          )}
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
                    <thead><tr><th>Customer</th><th>Order #</th><th>Commodity</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Cases</th><th>Status</th><th></th></tr></thead>
                    <tbody>{jacketLines.filter(jl => jl.jacket_product_line_id).map(jl => (
                      <tr key={jl.jacket_line_id}>
                        <td>{jl.order_lines?.customer_orders?.customers?.company}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{jl.order_lines?.customer_orders?.acumatica_order_no || '—'}</td>
                        <td><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ProductIcon commodity={jl.order_lines?.products?.commodity} size={20} />{jl.order_lines?.products?.commodity} — {jl.order_lines?.products?.pack_size}</div></td>
                        <td>{jl.jacket_product_lines?.suppliers?.company || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          {editingAllocationId === jl.jacket_line_id ? (
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <input type="number" value={editAllocationValue} onChange={e => setEditAllocationValue(e.target.value)} style={{ width: 70 }} />
                              <button onClick={() => saveEditAllocation(jl)} className="fo-btn fo-btn-sm">Save</button>
                              <button onClick={() => setEditingAllocationId(null)} className="fo-btn fo-btn-sm">X</button>
                            </div>
                          ) : jl.cases_to_load}
                        </td>
                        <td>{jl.load_status}</td>
                        <td>
                          {editingAllocationId !== jl.jacket_line_id && (
                            <>
                              <button onClick={() => openEditAllocation(jl)} className="fo-btn fo-btn-secondary fo-btn-sm">Edit</button>{' '}
                              <button onClick={() => removeAllocation(jl)} className="fo-btn fo-btn-danger fo-btn-sm">Remove</button>
                            </>
                          )}
                        </td>
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
              <div className="fo-card no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Freight</div>
                  {!editingFreight && (
                    <div>
                      <button onClick={openFreightEdit} className="fo-btn fo-btn-secondary fo-btn-sm">{freight ? 'Edit' : '+ Add Freight Record'}</button>
                      {freight && <button onClick={deleteFreight} className="fo-btn fo-btn-danger fo-btn-sm" style={{ marginLeft: 6 }}>Delete</button>}
                    </div>
                  )}
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
              <div className="fo-card no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Route — {pickups.length} pickup(s) → {deliveries.length} delivery(ies)</div>
                  <button onClick={() => window.print()} className="fo-btn fo-btn-secondary fo-btn-sm">🖨 Print Freight Ticket</button>
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
                      <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>Stop # <input type="number" defaultValue={s.stop_number} onBlur={e => updateStopNumber(s.stop_id, e.target.value)} style={{ width: 62, boxSizing: 'border-box' }} /></span>
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
                {freightOnlyLines.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--fo-border-soft)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Freight-Only Product on This Truck</div>
                    {freightOnlyLines.map(f => (
                      <div key={f.freight_only_line_id} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--fo-border-soft)' }}>
                        <span className="fo-badge fo-badge-blue" style={{ marginRight: 6 }}>Freight Only</span>
                        {f.cases} cases {f.commodity_description} — {f.customer_orders?.customers?.company}
                        {(f.pickup_location || f.delivery_location) && <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{f.pickup_location} → {f.delivery_location}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ---- Print-Only Freight Ticket — clean, no buttons/inputs, logo included ---- */}
              <div className="print-only-block" style={{ background: '#fff', color: '#1B231D', padding: '4px 6px', width: '100%', boxSizing: 'border-box', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {/* ---- Top Branding ---- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10 }}>
                  <img src="/brand/profresh-sourcing-logo.png" alt="ProFresh Sourcing" style={{ height: 46, width: 'auto' }} />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10.5, color: '#9A9D93' }}>Prepared in</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                      <Logo variant="icon" size={16} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6A746D' }}>FreshOps</span>
                    </div>
                    <div style={{ fontSize: 9, color: '#B8BBB2' }}>Business Intelligence</div>
                  </div>
                </div>

                {/* ---- Document Title Row ---- */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '2px solid #165C3A', borderBottom: '1px solid #DCE3DA', padding: '10px 0' }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: '#165C3A' }}>Freight Ticket — Jacket {jacket.jacket_number}</div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#6A746D' }}>
                    <div>Date: {jacket.jacket_date || '—'}</div>
                    <div>Status: {jacket.jacket_status || '—'}</div>
                  </div>
                </div>

                {/* ---- Summary Bar ---- */}
                <div style={{ display: 'flex', background: '#F4F7F3', border: '1px solid #E2E7E1', borderRadius: 8, padding: '10px 16px', margin: '12px 0', gap: 24 }}>
                  {[
                    ['Carrier', freight?.carrier || '—'],
                    ['Driver', jacket.driver || '—'],
                    ['Truck / Trailer', `${jacket.truck || '—'} / ${jacket.trailer || '—'}`],
                    ['Total Weight', `${totalWeight.toLocaleString()} lb.`],
                    ['Total Pallets', `${totalPallets} plt.`],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <div style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '.03em', color: '#6A746D', fontWeight: 700 }}>{label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1B231D' }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* ---- Stops ---- */}
                {stops.map(s => {
                  const isPickup = s.stop_type === 'Pickup';
                  const partyName = isPickup ? s.suppliers?.company : s.customers?.company;
                  const address = isPickup
                    ? (s.supplier_locations ? `${s.supplier_locations.label} — ${s.supplier_locations.address}, ${s.supplier_locations.city} ${s.supplier_locations.state}` : `${s.suppliers?.pickup_address || ''}, ${s.suppliers?.city || ''} ${s.suppliers?.state || ''}`)
                    : (s.customer_locations ? `${s.customer_locations.label} — ${s.customer_locations.address}, ${s.customer_locations.city} ${s.customer_locations.state}` : `${s.customers?.delivery_address || ''}, ${s.customers?.city || ''} ${s.customers?.state || ''}`);
                  return (
                    <div key={s.stop_id} style={{ border: '1px solid #E2E7E1', borderRadius: 10, padding: 12, marginBottom: 10, pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: '50%', background: '#165C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{s.stop_number}</div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.02em', color: isPickup ? '#2B6CB0' : '#1E824C' }}>Stop #{s.stop_number} — {s.stop_type}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#1B231D', marginTop: 2 }}>{partyName || '—'}</div>
                            <div style={{ fontSize: 11.5, color: '#6A746D', marginTop: 2 }}>📍 {address || '—'}</div>
                            {s.appointment && <div style={{ fontSize: 11, color: '#6A746D', marginTop: 2 }}>Appt: {new Date(s.appointment).toLocaleString()}</div>}
                          </div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead><tr style={{ background: '#EEF3EC' }}>
                            <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700, color: '#3F6B4F', borderRadius: '4px 0 0 4px' }}>Commodity</th>
                            <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700, color: '#3F6B4F' }}>Cases</th>
                            <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700, color: '#3F6B4F', borderRadius: '0 4px 4px 0' }}>Pallets</th>
                          </tr></thead>
                          <tbody>{(s.stop_lines || []).map(sl => (
                            <tr key={sl.stop_line_id} style={{ borderBottom: '1px solid #F0F0EB' }}>
                              <td style={{ padding: '4px 8px' }}>{sl.jacket_lines?.order_lines?.products?.commodity} — {sl.jacket_lines?.order_lines?.products?.pack_size}</td>
                              <td style={{ textAlign: 'right', padding: '4px 8px' }}>{sl.cases_at_stop}</td>
                              <td style={{ textAlign: 'right', padding: '4px 8px' }}>{sl.pallets_at_stop}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #EFEEE7', fontSize: 10, color: '#B8BBB2' }}>Generated {new Date().toLocaleString()}</div>
              </div>

              {/* ---- Load Tracking ---- */}
              <div className="fo-card no-print">
                <div className="fo-h2">Load Tracking, by Commodity</div>
                {groupList.length === 0 ? (
                  <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No allocations to track yet.</div>
                ) : groupList.map(g => {
                  const groupLines = jacketLines.filter(l => l.order_lines?.product_id === g.productId && l.order_lines?.supplier_id === g.supplierId);
                  const variance = g.loaded - g.ordered;
                  return (
                    <div key={g.productId + '-' + g.supplierId} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', overflow: 'hidden', marginBottom: 12 }}>
                      <div style={{ background: variance !== 0 && g.loaded > 0 ? 'var(--fo-warn-bg)' : 'var(--fo-section-bg)', padding: '8px 12px', fontSize: 13, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ProductIcon commodity={g.commodity} size={20} /><strong>{g.commodity} — {g.packSize}</strong> · {g.supplierName || 'no supplier'}</div>
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
              <div className="fo-card no-print">
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
                          {c.jacket_line_id && (() => {
                            const disp = availableForLine(c.jacket_line_id);
                            if (disp.rejected === 0) return null;
                            return (
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 12 }}>
                                <span>Rejected <strong>{disp.rejected}</strong></span>
                                <span>Reassigned <strong>{disp.reassigned}</strong></span>
                                <span>Dumped <strong>{disp.dumped}</strong></span>
                                <span style={{ color: disp.available > 0 ? 'var(--fo-warn)' : 'var(--fo-text-dim)' }}>Available <strong>{disp.available}</strong></span>
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openEditClaim(c)} className="fo-btn fo-btn-secondary fo-btn-sm">Edit</button>
                          <button onClick={() => openResolve(c)} className="fo-btn fo-btn-sm">{c.status === 'Open' ? 'Resolve' : 'Update Resolution'}</button>
                          <button onClick={() => openMarkRejected(c)} className="fo-btn fo-btn-secondary fo-btn-sm">Mark Rejected</button>
                          <button onClick={() => openReassignPicker(c)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Reassign Cases</button>
                          <button onClick={() => openDumpCases(c)} className="fo-btn fo-btn-danger fo-btn-sm">Dump Cases</button>
                          <button onClick={() => openCompensation(c)} className="fo-btn fo-btn-sm">Add Compensation</button>
                          <button onClick={() => deleteClaim(c.claim_id)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                        </div>
                      </div>
                      {editingClaimId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                          <label style={{ fontSize: 13 }}><span className="fo-field-label">Type</span>
                            <select value={editClaimForm.claim_type} onChange={e => setEditClaimForm({ ...editClaimForm, claim_type: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                              <option>Quality</option><option>Shortage</option><option>Overage</option><option>Damage</option><option>Pricing</option><option>Other</option>
                            </select>
                          </label>
                          <div style={{ gridColumn: 'span 2' }}>{textField('Description', editClaimForm.description, v => setEditClaimForm({ ...editClaimForm, description: v }))}</div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <button onClick={() => saveEditClaim(c)} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save</button>
                            <button onClick={() => setEditingClaimId(null)} className="fo-btn fo-btn-secondary">Cancel</button>
                          </div>
                        </div>
                      )}
                      {resolvingId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                          <label style={{ fontSize: 13 }}><span className="fo-field-label">Status</span>
                            <select value={resolveForm.status} onChange={e => setResolveForm({ ...resolveForm, status: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                              <option>Open</option><option>Under Review</option><option>Resolved</option>
                            </select>
                          </label>
                          {c.jacket_lines?.order_lines?.cases_ordered != null && textField(`New Cases Ordered (currently ${c.jacket_lines.order_lines.cases_ordered} — leave blank to keep)`, resolveForm.new_cases_ordered, v => setResolveForm({ ...resolveForm, new_cases_ordered: v }), 'number')}
                          {textField('Price Change ($/case) — use a negative number to reduce, e.g. -2 for $2 off', resolveForm.price_adjustment, v => setResolveForm({ ...resolveForm, price_adjustment: v }), 'number')}
                          {resolveForm.price_adjustment && c.jacket_lines?.order_lines?.sell_price_per_case != null && (
                            <div style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', display: 'flex', alignItems: 'center' }}>
                              ${Number(c.jacket_lines.order_lines.sell_price_per_case).toFixed(2)} → <strong style={{ marginLeft: 4, color: Number(resolveForm.price_adjustment) < 0 ? 'var(--fo-error)' : 'var(--fo-success)' }}>${(Number(c.jacket_lines.order_lines.sell_price_per_case) + Number(resolveForm.price_adjustment)).toFixed(2)}</strong>
                            </div>
                          )}
                          <div style={{ gridColumn: 'span 2' }}>{textField('Resolution Notes', resolveForm.resolution, v => setResolveForm({ ...resolveForm, resolution: v }))}</div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <button onClick={() => saveResolve(c)} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save</button>
                            <button onClick={() => setResolvingId(null)} className="fo-btn fo-btn-secondary">Cancel</button>
                          </div>
                        </div>
                      )}
                      {rejectingClaimId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 13 }}>Cases Rejected<input type="number" value={rejectForm.cases} onChange={e => setRejectForm({ ...rejectForm, cases: e.target.value })} style={{ display: 'block', width: 90, marginTop: 4 }} /></label>
                          <label style={{ fontSize: 13 }}>Notes<input value={rejectForm.notes} onChange={e => setRejectForm({ ...rejectForm, notes: e.target.value })} style={{ display: 'block', minWidth: 200, marginTop: 4 }} /></label>
                          <button onClick={() => saveMarkRejected(c)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Confirm</button>
                          <button onClick={() => setRejectingClaimId(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                          <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', width: '100%' }}>This sets the order line's status and makes these cases available to reassign or dump — it doesn't touch the claim's own financial resolution.</div>
                        </div>
                      )}
                      {reassignPickerFor?.claimId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)' }}>
                          <div style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', marginBottom: 8 }}><strong>{reassignPickerFor.available}</strong> cases available to reassign</div>
                          {!reassignMode ? (
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button onClick={() => chooseReassignMode('existing')} className="fo-btn fo-btn-sm">Assign to Existing Order</button>
                              <button onClick={() => chooseReassignMode('allocation')} className="fo-btn fo-btn-sm">Move to Existing Allocation</button>
                              <button onClick={() => setReassignMode('new')} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Create New Order</button>
                              <button onClick={closeReassignPicker} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                            </div>
                          ) : reassignMode === 'new' ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                              <label style={{ fontSize: 13 }}>Customer
                                <select value={newOrderFromRejectForm.customer_id} onChange={e => setNewOrderFromRejectForm({ ...newOrderFromRejectForm, customer_id: e.target.value })} style={{ display: 'block', minWidth: 180, marginTop: 4 }}>
                                  <option value="">— select —</option>
                                  {customers.map(cu => <option key={cu.customer_id} value={cu.customer_id}>{cu.company}</option>)}
                                </select>
                              </label>
                              <label style={{ fontSize: 13 }}>Cases<input type="number" value={newOrderFromRejectForm.cases} onChange={e => setNewOrderFromRejectForm({ ...newOrderFromRejectForm, cases: e.target.value })} style={{ display: 'block', width: 80, marginTop: 4 }} /></label>
                              <label style={{ fontSize: 13 }}>Sell $/cs<input type="number" value={newOrderFromRejectForm.sell_price_per_case} onChange={e => setNewOrderFromRejectForm({ ...newOrderFromRejectForm, sell_price_per_case: e.target.value })} style={{ display: 'block', width: 90, marginTop: 4 }} /></label>
                              <label style={{ fontSize: 13 }}>Customer PO<input value={newOrderFromRejectForm.customer_po} onChange={e => setNewOrderFromRejectForm({ ...newOrderFromRejectForm, customer_po: e.target.value })} style={{ display: 'block', width: 110, marginTop: 4 }} /></label>
                              <button onClick={saveCreateNewOrderFromReject} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Create Order & Assign</button>
                              <button onClick={() => setReassignMode(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Back</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                              <label style={{ fontSize: 13 }}>{reassignMode === 'existing' ? 'Assign to which order?' : 'Move to which allocation?'}
                                <select value={assignExistingForm.order_line_id} onChange={e => setAssignExistingForm({ ...assignExistingForm, order_line_id: e.target.value })} style={{ display: 'block', minWidth: 220, marginTop: 4 }}>
                                  <option value="">— select —</option>
                                  {assignExistingOptions.map(ol => <option key={ol.order_line_id} value={ol.order_line_id}>{ol.customer_orders?.acumatica_order_no} — {ol.customer_orders?.customers?.company}</option>)}
                                </select>
                              </label>
                              <label style={{ fontSize: 13 }}>Cases<input type="number" value={assignExistingForm.cases} onChange={e => setAssignExistingForm({ ...assignExistingForm, cases: e.target.value })} style={{ display: 'block', width: 80, marginTop: 4 }} /></label>
                              <button onClick={saveAssignExisting} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>Confirm</button>
                              <button onClick={() => setReassignMode(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Back</button>
                            </div>
                          )}
                        </div>
                      )}
                      {showDumpFor?.claimId === c.claim_id && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--fo-border-soft)' }}>
                          <div style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', marginBottom: 8 }}><strong>{showDumpFor.available}</strong> cases available to dump</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <label style={{ fontSize: 13 }}>Cases<input type="number" value={dumpForm.cases} onChange={e => setDumpForm({ ...dumpForm, cases: e.target.value })} style={{ display: 'block', width: 80, marginTop: 4 }} /></label>
                            <label style={{ fontSize: 13 }}>Date<input type="date" value={dumpForm.dump_date} onChange={e => setDumpForm({ ...dumpForm, dump_date: e.target.value })} style={{ display: 'block', marginTop: 4 }} /></label>
                            <label style={{ fontSize: 13 }}>Reason
                              <select value={dumpForm.reason} onChange={e => setDumpForm({ ...dumpForm, reason: e.target.value })} style={{ display: 'block', marginTop: 4 }}>
                                <option>Quality/Condition</option><option>Out of Grade</option><option>No Home Found</option><option>Temperature Issue</option><option>Other</option>
                              </select>
                            </label>
                            <label style={{ fontSize: 13 }}>Dump Fee ($)<input type="number" value={dumpForm.dump_fee} onChange={e => setDumpForm({ ...dumpForm, dump_fee: e.target.value })} style={{ display: 'block', width: 90, marginTop: 4 }} /></label>
                            <label style={{ fontSize: 13 }}>Notes<input value={dumpForm.notes} onChange={e => setDumpForm({ ...dumpForm, notes: e.target.value })} style={{ display: 'block', minWidth: 160, marginTop: 4 }} /></label>
                            <button onClick={saveDumpCases} className="fo-btn fo-btn-danger fo-btn-sm">Confirm Dump</button>
                            <button onClick={() => setShowDumpFor(null)} className="fo-btn fo-btn-secondary fo-btn-sm">Cancel</button>
                          </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* ---- Section 1: Profit Summary (expanded, same card you already had) ---- */}
              <div className="fo-card">
                <div className="fo-h2">Profit Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--fo-border-soft)' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Revenue Breakdown</div>
                    <BarChart
                      data={[
                        { label: 'Product', value: estRevenue },
                        { label: 'Freight-Only', value: freightOnlyRevenue },
                        { label: 'Other', value: adjustmentsRevenue },
                      ].filter(d => d.value !== 0)}
                      formatValue={v => `$${v.toLocaleString()}`}
                      emptyText="No revenue yet."
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>Cost Breakdown</div>
                    <BarChart
                      data={[
                        { label: 'Product', value: baseCostTotal, color: 'var(--fo-error)' },
                        { label: 'Supplier Fees', value: supplierFeesTotal, color: 'var(--fo-error)' },
                        { label: 'Freight', value: freightCost, color: 'var(--fo-error)' },
                        { label: 'Other', value: adjustmentsCost, color: 'var(--fo-error)' },
                      ].filter(d => d.value !== 0)}
                      formatValue={v => `$${v.toLocaleString()}`}
                      emptyText="No costs yet."
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Revenue</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 12 }}>
                  <FinRow label="Product Revenue" value={estRevenue} />
                  <FinRow label="Freight-Only Revenue" value={freightOnlyRevenue} />
                  <FinRow label="Other Revenue (Adjustments)" value={adjustmentsRevenue} />
                  <FinRow label="Total Revenue" value={totalRevenue} bold />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Cost</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 12 }}>
                  <FinRow label="Product Cost (base)" value={-baseCostTotal} />
                  <FinRow label="Supplier Fees" value={-supplierFeesTotal} />
                  <FinRow label="Freight Cost" value={-freightCost} />
                  <FinRow label="Other Costs (Adjustments)" value={-adjustmentsCost} />
                  <FinRow label="Claims / Credits Impact" value={claimsImpact} />
                  <FinRow label="Total Cost" value={-totalCost} bold />
                </div>
                <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--fo-border-soft)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16 }}>
                  <div>
                    <div className="fo-kpi-label">Estimated Profit</div>
                    <div className="fo-kpi-value" style={{ color: totalProfit >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>${totalProfit.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="fo-kpi-label">Estimated Margin</div>
                    <div className="fo-kpi-value" style={{ color: totalMarginPct >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>{totalMarginPct.toFixed(1)}%</div>
                  </div>
                  {jacket.jacket_status === 'Closed' && (
                    <>
                      <div>
                        <div className="fo-kpi-label">Final Profit</div>
                        <div className="fo-kpi-value" style={{ color: totalProfit >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>${totalProfit.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="fo-kpi-label">Final Margin</div>
                        <div className="fo-kpi-value">{totalMarginPct.toFixed(1)}%</div>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 8 }}>Freight-Only revenue is never mixed into Product Revenue above.</div>
              </div>

              {/* ---- Section 2: Product Sales Detail ---- */}
              <div className="fo-card">
                <div className="fo-h2">Product Sales</div>
                {productSalesRows.length === 0 ? (
                  <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No allocations on this Jacket yet.</div>
                ) : (
                  <div className="fo-table-wrap">
                    <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><th>Customer</th><th>Order #</th><th>Product</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right' }}>Sell $/cs</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Cost $/cs</th><th style={{ textAlign: 'right' }}>Cost</th><th style={{ textAlign: 'right' }}>Profit</th><th style={{ textAlign: 'right' }}>Margin</th></tr></thead>
                      <tbody>{productSalesRows.map(r => (
                        <tr key={r.key}>
                          <td>{r.customer}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.orderNo || '—'}</td>
                          <td>{r.commodity} — {r.packSize}</td>
                          <td style={{ textAlign: 'right' }}>{r.cases}</td>
                          <td style={{ textAlign: 'right' }}>${r.sell.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>${r.revenue.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>${r.cost.toFixed(2)}</td>
                          <td style={{ textAlign: 'right' }}>${r.lineCost.toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: r.profit >= 0 ? 'var(--fo-success)' : 'var(--fo-error)', fontWeight: 600 }}>${r.profit.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{r.margin.toFixed(1)}%</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ---- Section 3: Purchased Product & Supplier Cost ---- */}
              <div className="fo-card">
                <div className="fo-h2">Purchased Product & Supplier Cost</div>
                {purchasedLines.length === 0 ? (
                  <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>Nothing purchased on this Jacket yet.</div>
                ) : (
                  <div className="fo-table-wrap">
                    <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><th>Supplier</th><th>Shipper PO</th><th>Product</th><th style={{ textAlign: 'right' }}>Purchased</th><th style={{ textAlign: 'right' }}>Received</th><th style={{ textAlign: 'right' }}>Cost $/cs</th><th style={{ textAlign: 'right' }}>Fees $/cs</th><th style={{ textAlign: 'right' }}>Total Cost</th><th style={{ textAlign: 'right' }}>Allocated</th><th style={{ textAlign: 'right' }}>Available</th></tr></thead>
                      <tbody>{purchasedLines.map(p => {
                        const { allocated, available } = availableOnPurchased(p);
                        const base = p.actual_cases_received != null ? Number(p.actual_cases_received) : Number(p.purchased_cases);
                        const totalCostLine = base * (Number(p.purchase_cost_per_case || 0) + Number(p.fee_total_per_case || 0));
                        return (
                          <tr key={p.jacket_product_line_id}>
                            <td>{p.suppliers?.company || '—'}</td>
                            <td>{p.shipper_po || '—'}</td>
                            <td>{p.products?.commodity} — {p.products?.pack_size}</td>
                            <td style={{ textAlign: 'right' }}>{p.purchased_cases}</td>
                            <td style={{ textAlign: 'right' }}>{p.actual_cases_received ?? '—'}</td>
                            <td style={{ textAlign: 'right' }}>${Number(p.purchase_cost_per_case || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>${Number(p.fee_total_per_case || 0).toFixed(2)}</td>
                            <td style={{ textAlign: 'right' }}>${totalCostLine.toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{allocated}</td>
                            <td style={{ textAlign: 'right', color: available > 0 ? 'var(--fo-warn)' : 'var(--fo-text-dim)' }}>{available}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ---- Section 4: Freight Financials ---- */}
              <div className="fo-card">
                <div className="fo-h2">Freight Financials</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 12 }}>
                  <div><div className="fo-label">Carrier</div>{freight?.carrier || '—'}</div>
                  <FinRow label="Booked Freight Cost" value={-(freight ? Number(freight.booked_rate || 0) : 0)} />
                  <FinRow label="Other Freight Charges" value={-(freight ? Number(freight.extra_fees || 0) : 0)} />
                  <FinRow label="Freight-Only Revenue" value={freightOnlyRevenue} />
                  <div>
                    <div className="fo-kpi-label">Freight Profit / Loss</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: (freightOnlyRevenue - freightCost) >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>${(freightOnlyRevenue - freightCost).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fo-text-faint)' }}>No separate "actual vs booked" freight field exists yet — Booked Rate is used as the real cost. Per-customer Delivered freight charges only show where a Price Worksheet snapshot captured the FOB/freight split; orders priced without one show "—" rather than a guessed number.</div>
                {jacketLines.filter(l => l.jacket_product_line_id).length > 0 && (
                  <div className="fo-table-wrap" style={{ marginTop: 12 }}>
                    <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><th>Customer</th><th>Order #</th><th>Pricing Type</th><th style={{ textAlign: 'right' }}>Freight Charge</th></tr></thead>
                      <tbody>{jacketLines.filter(l => l.jacket_product_line_id).map(l => {
                        const snap = l.order_lines?.price_snapshot;
                        const freightCharge = snap?.customer_freight_per_case != null ? Number(snap.customer_freight_per_case) * Number(l.cases_to_load || 0) : null;
                        return (
                          <tr key={l.jacket_line_id}>
                            <td>{l.order_lines?.customer_orders?.customers?.company}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.order_lines?.customer_orders?.acumatica_order_no || '—'}</td>
                            <td>{l.order_lines?.pricing_type || '—'}</td>
                            <td style={{ textAlign: 'right' }}>{freightCharge != null ? `$${freightCharge.toLocaleString()}` : '—'}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                )}
                {freightOnlyLines.length > 0 && (
                  <div className="fo-table-wrap" style={{ marginTop: 12 }}>
                    <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><th>Customer</th><th>Pricing Type</th><th style={{ textAlign: 'right' }}>Freight Charge</th><th style={{ textAlign: 'right' }}>Allocated Cost</th><th style={{ textAlign: 'right' }}>Profit</th></tr></thead>
                      <tbody>{freightOnlyLines.map(f => (
                        <tr key={f.freight_only_line_id}>
                          <td>{f.customer_orders?.customers?.company}</td>
                          <td>Freight Only</td>
                          <td style={{ textAlign: 'right' }}>${Number(f.customer_freight_charge || 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>${Number(f.allocated_freight_cost || 0).toLocaleString()}</td>
                          <td style={{ textAlign: 'right', color: (Number(f.customer_freight_charge || 0) - Number(f.allocated_freight_cost || 0)) >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>${(Number(f.customer_freight_charge || 0) - Number(f.allocated_freight_cost || 0)).toLocaleString()}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ---- Section 5: Supplier Settlement (expanded Supplier Payment) ---- */}
              <div className="fo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Supplier Settlement</div>
                  {!editingPayment && <button onClick={openEditPayment} className="fo-btn fo-btn-secondary fo-btn-sm">Edit</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, margin: '10px 0' }}>
                  <div><div className="fo-label">Supplier(s)</div>{[...new Set(purchasedLines.map(p => p.suppliers?.company).filter(Boolean))].join(', ') || '—'}</div>
                  <FinRow label="Product Cost" value={-baseCostTotal} />
                  <FinRow label="Supplier Fees" value={-supplierFeesTotal} />
                  <div>
                    <div className="fo-kpi-label">Amount Owed</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>${(baseCostTotal + supplierFeesTotal).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="fo-kpi-label">Remaining Balance</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fo-warn)' }}>${Math.max(0, baseCostTotal + supplierFeesTotal - Number(jacket.supplier_amount_paid || 0)).toLocaleString()}</div>
                  </div>
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
                    <label style={{ fontSize: 13 }}>
                      <span className="fo-field-label">Payment Arrangement</span>
                      <select value={paymentForm.supplier_payment_arrangement} onChange={e => setPaymentForm({ ...paymentForm, supplier_payment_arrangement: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        <option value="">— select —</option>
                        <option>Paid in Full / Flat Purchase</option>
                        <option>Other</option>
                      </select>
                    </label>
                    {textField('Due Date', paymentForm.supplier_payment_due_date, v => setPaymentForm({ ...paymentForm, supplier_payment_due_date: v }), 'date')}
                    <div style={{ gridColumn: 'span 2' }}>{textField('Notes / Payment Reference', paymentForm.supplier_payment_notes, v => setPaymentForm({ ...paymentForm, supplier_payment_notes: v }))}</div>
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
                <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 10 }}>Return-Based / Minimum + Return settlement tracking isn't built yet — flag if you want that added later.</div>
              </div>

              {/* ---- Section 6: Costs & Adjustments ---- */}
              <div className="fo-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="fo-h2" style={{ marginBottom: 0 }}>Costs & Adjustments</div>
                  <button onClick={() => setShowAddAdjustment(!showAddAdjustment)} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-primary)', color: '#fff' }}>+ Add Financial Adjustment</button>
                </div>
                {showAddAdjustment && (
                  <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    <label style={{ fontSize: 13 }}><span className="fo-field-label">Type</span>
                      <select value={adjustmentForm.adjustment_type} onChange={e => setAdjustmentForm({ ...adjustmentForm, adjustment_type: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        {['Cold Storage', 'Cooler Fee', 'Repacking', 'Handling', 'Inspection', 'Additional Freight', 'Claim Credit', 'Customer Credit', 'Supplier Credit', 'Price Adjustment', 'Damage', 'Rejected Product Cost', 'Exception Recovery Cost', 'Other'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </label>
                    <label style={{ fontSize: 13 }}><span className="fo-field-label">Revenue or Cost</span>
                      <select value={adjustmentForm.direction} onChange={e => setAdjustmentForm({ ...adjustmentForm, direction: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                        <option>Cost</option><option>Revenue</option>
                      </select>
                    </label>
                    {textField('Amount ($)', adjustmentForm.amount, v => setAdjustmentForm({ ...adjustmentForm, amount: v }), 'number')}
                    {textField('Date', adjustmentForm.adjustment_date, v => setAdjustmentForm({ ...adjustmentForm, adjustment_date: v }), 'date')}
                    {textField('Description', adjustmentForm.description, v => setAdjustmentForm({ ...adjustmentForm, description: v }))}
                    <div style={{ gridColumn: '1 / -1' }}>{textField('Notes', adjustmentForm.notes, v => setAdjustmentForm({ ...adjustmentForm, notes: v }))}</div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <button onClick={saveAdjustment} className="fo-btn fo-btn-primary" style={{ marginRight: 8 }}>Save</button>
                      <button onClick={() => setShowAddAdjustment(false)} className="fo-btn fo-btn-secondary">Cancel</button>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  {financialAdjustments.length === 0 ? <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No adjustments logged.</div> : financialAdjustments.map(a => (
                    <div key={a.adjustment_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--fo-border-soft)', fontSize: 13.5 }}>
                      <div>
                        <span className={a.direction === 'Revenue' ? 'fo-badge fo-badge-green' : 'fo-badge fo-badge-red'}>{a.direction === 'Revenue' ? '+' : '-'}${Number(a.amount).toLocaleString()}</span>{' '}
                        <strong>{a.adjustment_type}</strong>{a.description ? ` — ${a.description}` : ''}
                        <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{a.adjustment_date}{a.notes ? ` · ${a.notes}` : ''}</div>
                      </div>
                      <button onClick={() => deleteAdjustment(a)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- Section 8: Financial Readiness ---- */}
              <div className="fo-card">
                <div className="fo-h2">Financial Readiness</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {readinessItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--fo-section-bg)', borderRadius: 'var(--fo-radius-sm)' }}>
                      <span style={{ fontSize: 13, color: 'var(--fo-text-dim)' }}>{item.label}</span>
                      <span className={item.ok ? 'fo-badge fo-badge-green' : 'fo-badge fo-badge-amber'}>{item.ok ? 'Ready' : 'Incomplete'}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 10 }}>Informational only — nothing here finalizes or closes the Jacket automatically.</div>
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
        <div className="fo-card fo-card-tight no-print fo-timeline-rail" style={{ position: 'sticky', top: 20 }}>
          {timelinePanelContent}
        </div>
      </div>

      {/* ---- Mobile Activity Drawer — same content, opened via the
          mobile-only "Activity" button. Desktop never sees this. ---- */}
      <div className={'no-print fo-activity-backdrop' + (showActivityDrawer ? ' open' : '')} onClick={() => setShowActivityDrawer(false)} />
      <div className={'no-print fo-activity-drawer' + (showActivityDrawer ? ' open' : '')}>
        <button className="fo-drawer-close-dark" onClick={() => setShowActivityDrawer(false)} aria-label="Close activity">✕</button>
        {timelinePanelContent}
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
function FinRow({ label, value, bold }) {
  return (
    <div>
      <div className="fo-kpi-label">{label}</div>
      <div style={{ fontSize: bold ? 20 : 18, fontWeight: bold ? 800 : 700, color: value < 0 ? 'var(--fo-error)' : 'var(--fo-text)' }}>{value < 0 ? '-' : ''}${Math.abs(value).toLocaleString()}</div>
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

function OverviewTab({ jacket, purchasedLines, jacketLines, claims, freight, availableOnPurchased, totalWeight, totalPallets, weightCapacity, palletCapacity,
  estRevenue, freightOnlyRevenue, adjustmentsRevenue, baseCostTotal, supplierFeesTotal, freightCost, adjustmentsCost, totalRevenue, totalCost, totalProfit, totalMarginPct,
  routeStops, commodityLoads }) {
  const hasProduct = purchasedLines.length > 0;
  const totals = purchasedLines.reduce((s, p) => {
    const a = availableOnPurchased(p);
    return { base: s.base + a.base, allocated: s.allocated + a.allocated };
  }, { base: 0, allocated: 0 });
  const stillAvailable = totals.base - totals.allocated;
  const allocationPct = totals.base > 0 ? Math.round((totals.allocated / totals.base) * 100) : 0;
  const palletPct = palletCapacity > 0 ? Math.round((totalPallets / palletCapacity) * 100) : 0;
  const weightPct = weightCapacity > 0 ? Math.round((totalWeight / weightCapacity) * 100) : 0;

  // ---- Attention Radar — real data only, each item carries a genuine
  // severity rather than one blanket color ----
  const attention = [];
  if (totalWeight > weightCapacity) attention.push({ text: `Over weight capacity — ${totalWeight.toLocaleString()} / ${weightCapacity.toLocaleString()} lb`, severity: 'red' });
  if (totalPallets > palletCapacity) attention.push({ text: `Over pallet capacity — ${totalPallets} / ${palletCapacity} pallets`, severity: 'red' });
  if (claims.length > 0) attention.push({ text: `${claims.length} open claim${claims.length === 1 ? '' : 's'}`, severity: 'red' });
  if (stillAvailable > 0) attention.push({ text: `${stillAvailable} cases still available to sell`, severity: 'amber' });
  if (hasProduct && !freight) attention.push({ text: 'Carrier not booked', severity: 'amber' });
  if (freight && !freight.carrier_paid) attention.push({ text: 'Carrier not yet paid', severity: 'blue' });
  if (hasProduct && jacket.supplier_payment_status && jacket.supplier_payment_status !== 'Paid') attention.push({ text: `Supplier payment: ${jacket.supplier_payment_status}`, severity: 'blue' });
  const severityRank = { red: 0, amber: 1, blue: 2 };
  attention.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  const severityBadge = { red: 'fo-badge-red', amber: 'fo-badge-amber', blue: 'fo-badge-blue' };

  const logisticsState = ['In Transit', 'Delivered', 'Closed'].includes(jacket.jacket_status) ? 'Healthy' : jacket.jacket_status === 'Planning' ? 'Pending' : 'Attention';
  const financialsState = jacket.jacket_status === 'Closed' ? 'Healthy' : 'Pending';
  const claimsState = claims.length > 0 ? 'Issue' : 'Healthy';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ---- Jacket Health — consolidated command-center panel ---- */}
      <div className="fo-card">
        <div className="fo-h2">Jacket Health</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          <HealthMetric label="Allocation" value={hasProduct ? `${allocationPct}%` : '—'} pct={hasProduct ? allocationPct : null} tone={!hasProduct ? 'gray' : allocationPct >= 100 ? 'green' : allocationPct >= 50 ? 'amber' : 'red'} />
          <HealthMetric label="Pallets" value={`${palletPct}%`} pct={palletPct} tone={palletPct > 100 ? 'red' : palletPct >= 85 ? 'amber' : 'green'} />
          <HealthMetric label="Weight" value={`${weightPct}%`} pct={weightPct} tone={weightPct > 100 ? 'red' : weightPct >= 85 ? 'amber' : 'green'} />
          <HealthMetric label="Route" value={jacket.jacket_status} state={logisticsState} />
          <HealthMetric label="Financials" value={financialsState} state={financialsState} />
          <HealthMetric label="Claims" value={claims.length > 0 ? `${claims.length} Open` : 'None'} state={claimsState} />
        </div>
      </div>

      {/* ---- Route Progress ---- */}
      <div className="fo-card">
        <div className="fo-h2">Route Progress</div>
        {routeStops.length === 0 ? (
          <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No stops yet.</div>
        ) : (
          <div>
            {routeStops.map((s, i) => {
              const isLast = i === routeStops.length - 1;
              const dotColor = s.routeState === 'Completed' ? 'var(--fo-success)' : s.routeState === 'Current' ? 'var(--fo-primary)' : 'var(--fo-border)';
              const badgeTone = s.routeState === 'Completed' ? 'fo-badge-green' : s.routeState === 'Current' ? 'fo-badge-blue' : 'fo-badge-gray';
              return (
                <div key={s.stop_id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: 14, height: 14, borderRadius: '50%', boxSizing: 'border-box',
                      background: s.routeState === 'Upcoming' ? 'transparent' : dotColor,
                      border: `2px solid ${dotColor}`,
                      boxShadow: s.routeState === 'Current' ? '0 0 0 4px var(--fo-accent-soft)' : 'none',
                    }} />
                    {!isLast && <div style={{ width: 2, flex: 1, minHeight: 26, background: s.routeState === 'Completed' ? 'var(--fo-success)' : 'var(--fo-border-soft)' }} />}
                  </div>
                  <div style={{ paddingBottom: isLast ? 4 : 16, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>#{s.stop_number} — {s.stop_type} — {s.stop_type === 'Pickup' ? (s.suppliers?.company || '—') : (s.customers?.company || '—')}</div>
                    <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{s.casesAtStop} cases</div>
                    <span className={`fo-badge ${badgeTone}`} style={{ marginTop: 4 }}>{s.routeState}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Product Flow — every stage reuses the exact same values
          already used on the Products and Logistics tabs, nothing
          recalculated independently ---- */}
      <div className="fo-card">
        <div className="fo-h2">Product Flow</div>
        {purchasedLines.length === 0 ? (
          <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>Nothing purchased on this Jacket yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {purchasedLines.map(p => {
              const { base, allocated, available } = availableOnPurchased(p);
              const loadRow = commodityLoads.find(c => c.product_id === p.product_id && c.supplier_id === p.supplier_id);
              const loaded = loadRow ? Number(loadRow.actual_cases_loaded || 0) : 0;
              const delivered = jacketLines.filter(jl => jl.jacket_product_line_id === p.jacket_product_line_id).reduce((s, jl) => s + Number(jl.actual_cases_delivered || 0), 0);
              const flowAttention = [];
              if (allocated < base) flowAttention.push('Not fully allocated');
              if (allocated > 0 && loaded < allocated) flowAttention.push('Allocated but not loaded');
              if (loaded > 0 && delivered < loaded) flowAttention.push('Loaded but not delivered');
              return (
                <div key={p.jacket_product_line_id} style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><ProductIcon commodity={p.products?.commodity} size={22} />{p.products?.commodity} — {p.products?.pack_size}</div>
                  <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginBottom: 10 }}>{p.suppliers?.company || '—'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <ProgressBar label="Purchased" current={base} max={base} height={6} />
                    <ProgressBar label="Allocated" current={allocated} max={base} height={6} />
                    <ProgressBar label="Loaded" current={loaded} max={base} height={6} />
                    <ProgressBar label="Delivered" current={delivered} max={base} height={6} />
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fo-border-soft)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>Available</span>
                    <span className={`fo-badge ${available > 0 ? 'fo-badge-blue' : 'fo-badge-gray'}`}>{available} cs</span>
                  </div>
                  {flowAttention.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {flowAttention.map((a, i) => <span key={i} className="fo-badge fo-badge-amber" style={{ fontSize: 10.5 }}>{a}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Profit Pulse — reuses the exact same numbers as the
          Financials tab, nothing recalculated ---- */}
      <div className="fo-card">
        <div className="fo-h2">Profit Pulse</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 14 }}>
          <PulseStat label="Product Revenue" value={estRevenue} />
          <PulseStat label="Freight Revenue" value={freightOnlyRevenue} />
          <PulseStat label="Product Cost" value={-(baseCostTotal + supplierFeesTotal)} />
          <PulseStat label="Freight Cost" value={-freightCost} />
          {adjustmentsRevenue !== 0 || adjustmentsCost !== 0 ? <PulseStat label="Other Adjustments" value={adjustmentsRevenue - adjustmentsCost} /> : null}
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid var(--fo-border-soft)' }}>
          <div>
            <div className="fo-kpi-label">Estimated Profit</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: totalProfit >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>${totalProfit.toLocaleString()}</div>
          </div>
          <div>
            <div className="fo-kpi-label">Margin</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: totalMarginPct >= 0 ? 'var(--fo-success)' : 'var(--fo-error)' }}>{totalMarginPct.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* ---- Attention Radar ---- */}
      <div className="fo-card">
        <div className="fo-h2">Attention Radar</div>
        {attention.length === 0 ? (
          <span className="fo-badge fo-badge-green">All clear</span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attention.map((a, i) => <div key={i}><span className={`fo-badge ${severityBadge[a.severity]}`}>{a.text}</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}
function HealthMetric({ label, value, pct, tone, state }) {
  const stateColor = { Healthy: 'var(--fo-success)', Attention: 'var(--fo-warn)', Pending: 'var(--fo-text-faint)', Issue: 'var(--fo-error)' };
  const toneColor = { green: 'var(--fo-success)', amber: 'var(--fo-warn)', red: 'var(--fo-error)', gray: 'var(--fo-text-faint)' };
  const color = state ? (stateColor[state] || 'var(--fo-text-dim)') : (toneColor[tone] || 'var(--fo-text)');
  return (
    <div style={{ background: 'var(--fo-section-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--fo-text-dim)', textTransform: 'uppercase', letterSpacing: '.02em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
      {pct != null && (
        <div style={{ height: 5, background: 'var(--fo-card-bg)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width .3s ease' }} />
        </div>
      )}
    </div>
  );
}
function PulseStat({ label, value }) {
  return (
    <div>
      <div className="fo-kpi-label">{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: value < 0 ? 'var(--fo-error)' : 'var(--fo-text)' }}>{value < 0 ? '-' : ''}${Math.abs(value).toLocaleString()}</div>
    </div>
  );
}
