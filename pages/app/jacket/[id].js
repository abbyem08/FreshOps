// pages/app/jacket/[id].js
import { useEffect, useState } from 'react';
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
  const [documents, setDocuments] = useState([]);
  const [userEmail, setUserEmail] = useState('Staff');

  const [showAddPurchased, setShowAddPurchased] = useState(false);
  const [purchasedForm, setPurchasedForm] = useState(BLANK_PURCHASED);
  const [editingPurchasedId, setEditingPurchasedId] = useState(null);
  const [allocatingLineId, setAllocatingLineId] = useState(null);
  const [allocateForm, setAllocateForm] = useState({ order_line_id: '', cases: '' });
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({ customer_id: '', acumatica_no: '', customer_po: '', product_id: '', cases: '' });
  const [demandAllocateFor, setDemandAllocateFor] = useState(null);
  const [demandAllocateForm, setDemandAllocateForm] = useState({ purchased_line_id: '', cases: '' });
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({});
  const [showAmend, setShowAmend] = useState(false);
  const [amendForm, setAmendForm] = useState({ name: '', target: '', original: '', adjustment: '', newValue: '', reason: '' });
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({ document_type: '', file_name: '', url: '', notes: '' });
  const [editingPayment, setEditingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({});

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

    const { data: stopRows } = await supabase.from('stops').select('*, suppliers(company), customers(company)').eq('jacket_id', jacketId).order('stop_number');
    setStops(stopRows || []);
    const { data: fr } = await supabase.from('freight_records').select('*').eq('jacket_id', jacketId).order('quote_date', { ascending: false }).limit(1).maybeSingle();
    setFreight(fr || null);

    const { data: cl } = await supabase.from('claims').select('*, jacket_lines(order_line_id)').eq('status', 'Open');
    setClaims((cl || []).filter(c => (lines || []).some(l => l.jacket_line_id === c.jacket_line_id)));

    const { data: ev } = await supabase.from('jacket_events').select('*').eq('jacket_id', jacketId).order('created_at', { ascending: false });
    setEvents(ev || []);
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
      await logEvent('product_amended', `Purchased product amended — ${productLabel?.commodity}`, null, null, `${payload.purchased_cases} cases @ $${payload.purchase_cost_per_case}/cs`);
    } else {
      const { error } = await supabase.from('jacket_product_lines').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
      await logEvent('product_added', `Purchased ${payload.purchased_cases} cases of ${productLabel?.commodity} from ${suppliers.find(x => x.supplier_id === payload.supplier_id)?.company || 'no supplier'}`);
    }
    setShowAddPurchased(false); setEditingPurchasedId(null); setPurchasedForm(BLANK_PURCHASED);
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
    await logEvent('details_edited', `Jacket details updated (status: ${payload.jacket_status})`);
    setEditingDetails(false);
    loadAll();
  }
  async function saveAmendment() {
    if (!amendForm.name || !amendForm.target) { alert('Give the amendment a name and target field.'); return; }
    await logEvent('amendment', `${amendForm.name} — ${amendForm.target}${amendForm.reason ? ' (' + amendForm.reason + ')' : ''}`, amendForm.original || null, amendForm.adjustment || null, amendForm.newValue || null);
    setShowAmend(false);
    setAmendForm({ name: '', target: '', original: '', adjustment: '', newValue: '', reason: '' });
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
    loadAll();
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

  if (!jacket) return <AppShell title="Jacket"><p style={{ color: 'var(--fo-text-faint)' }}>Loading…</p></AppShell>;

  const totalPallets = purchasedLines.reduce((s, p) => s + (p.products?.cases_per_pallet ? Math.ceil((p.actual_cases_received ?? p.purchased_cases) / p.products.cases_per_pallet) : 0), 0);
  const totalWeight = purchasedLines.reduce((s, p) => s + (p.products?.gross_weight_per_case || 0) * (p.actual_cases_received ?? (p.purchased_cases || 0)), 0);
  const orderCount = new Set(jacketLines.map(l => l.order_lines?.customer_orders?.acumatica_order_no).filter(Boolean)).size;
  const estRevenue = jacketLines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.order_lines?.sell_price_per_case || 0), 0);
  const estCost = jacketLines.reduce((s, l) => s + Number(l.cases_to_load || 0) * Number(l.allocated_cost_per_case || 0), 0);
  const freightCost = freight ? Number(freight.booked_rate || 0) + Number(freight.extra_fees || 0) : 0;
  const estProfit = estRevenue - estCost - freightCost;

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
            <button onClick={() => setShowAmend(true)} className="fo-btn fo-btn-secondary fo-btn-sm">+ Amendment</button>
            <button onClick={closeJacket} className="fo-btn fo-btn-secondary fo-btn-sm">Close Jacket</button>
          </div>
        </div>
      </div>

      {showAmend && (
        <div className="fo-card" style={{ marginBottom: 16 }}>
          <div className="fo-h2">New Amendment</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {textField('Amendment Name', amendForm.name, v => setAmendForm({ ...amendForm, name: v }))}
            {textField('Target Field', amendForm.target, v => setAmendForm({ ...amendForm, target: v }))}
            {textField('Reason', amendForm.reason, v => setAmendForm({ ...amendForm, reason: v }))}
            {textField('Original Value', amendForm.original, v => setAmendForm({ ...amendForm, original: v }))}
            {textField('Adjustment', amendForm.adjustment, v => setAmendForm({ ...amendForm, adjustment: v }))}
            {textField('New Effective Value', amendForm.newValue, v => setAmendForm({ ...amendForm, newValue: v }))}
          </div>
          <button onClick={saveAmendment} className="fo-btn fo-btn-primary" style={{ marginTop: 10, marginRight: 8 }}>Save Amendment</button>
          <button onClick={() => setShowAmend(false)} className="fo-btn fo-btn-secondary">Cancel</button>
          <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 8 }}>This logs a note to the Timeline. A full linked amendment ledger (auto-updating values everywhere) is planned for Phase 4.</div>
        </div>
      )}

      {/* ---- Tabs + Timeline layout ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: 16, alignItems: 'start' }}>
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
                <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
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
                  <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
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
            <div className="fo-card">
              <div className="fo-h2">Route</div>
              <div style={{ fontSize: 13, color: 'var(--fo-text-dim)', marginBottom: 14 }}>
                {stops.filter(s => s.stop_type === 'Pickup').length} pickup(s) → {stops.filter(s => s.stop_type === 'Delivery').length} delivery(ies)
              </div>
              {stops.map(s => (
                <div key={s.stop_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--fo-border-soft)', fontSize: 13.5 }}>
                  <div><span className={s.stop_type === 'Pickup' ? 'fo-badge fo-badge-blue' : 'fo-badge fo-badge-green'}>#{s.stop_number} {s.stop_type}</span> {s.stop_type === 'Pickup' ? s.suppliers?.company : s.customers?.company}</div>
                  {s.appointment && <span style={{ color: 'var(--fo-text-dim)' }}>{new Date(s.appointment).toLocaleString()}</span>}
                </div>
              ))}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--fo-border-soft)' }}>
                <div className="fo-h2">Freight</div>
                {freight ? (
                  <div style={{ fontSize: 13.5, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    <div><div className="fo-label">Carrier</div>{freight.carrier}</div>
                    <div><div className="fo-label">Miles</div>{freight.miles || '—'}</div>
                    <div><div className="fo-label">Total Cost</div>${(Number(freight.booked_rate || 0) + Number(freight.extra_fees || 0)).toLocaleString()}</div>
                    <div><div className="fo-label">Status</div>{freight.status}</div>
                    <div><div className="fo-label">Invoice</div>{freight.invoice_received ? 'Received' : 'Pending'}</div>
                    <div><div className="fo-label">Paid</div>{freight.carrier_paid ? 'Yes' : 'No'}</div>
                  </div>
                ) : <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No freight record yet.</div>}
              </div>
              <a href="/app/dispatch" className="fo-btn fo-btn-secondary fo-btn-sm" style={{ marginTop: 16, display: 'inline-block', textDecoration: 'none' }}>Open Full Dispatch Sheet →</a>
            </div>
          )}

          {activeTab === 'Financials' && (
            <div className="fo-card">
              <div className="fo-h2">Profit Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 10 }}>
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
                <div style={{ border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-md)', padding: 12, marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
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
        <div className="fo-card" style={{ position: 'sticky', top: 20 }}>
          <div className="fo-h2">Timeline / Activity</div>
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
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {events.length === 0 ? <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No activity logged yet.</div> : events.map(ev => (
              <div key={ev.event_id} style={{ padding: '8px 0', borderBottom: '1px solid var(--fo-border-soft)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.description}</div>
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
  const stillAvailable = purchasedLines.reduce((s, p) => s + availableOnPurchased(p).available, 0);
  const attention = [];
  if (stillAvailable > 0) attention.push(`${stillAvailable} cases still available to sell`);
  if (claims.length > 0) attention.push(`${claims.length} open claim(s)`);
  if (!freight) attention.push('Carrier not booked');
  if (freight && !freight.carrier_paid) attention.push('Carrier not yet paid');
  if (jacket.supplier_payment_status !== 'Paid') attention.push(`Supplier payment: ${jacket.supplier_payment_status || 'Unpaid'}`);

  return (
    <div className="fo-card">
      <div className="fo-h2">Jacket Health</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        <HealthRow label="Supplier" value={purchasedLines.length > 0 ? 'Confirmed' : 'Waiting'} good={purchasedLines.length > 0} />
        <HealthRow label="Product" value={stillAvailable > 0 ? `${stillAvailable} cs Available` : 'Fully Allocated'} good={stillAvailable === 0} />
        <HealthRow label="Logistics" value={jacket.jacket_status} good={['In Transit', 'Delivered', 'Closed'].includes(jacket.jacket_status)} />
        <HealthRow label="Freight" value={freight ? freight.status : 'Unbooked'} good={!!freight} />
        <HealthRow label="Financials" value={jacket.jacket_status === 'Closed' ? 'Closed' : 'Open'} good={jacket.jacket_status === 'Closed'} />
        <HealthRow label="Claims" value={claims.length > 0 ? `${claims.length} Open` : 'None'} good={claims.length === 0} />
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
function HealthRow({ label, value, good }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--fo-section-bg)', borderRadius: 'var(--fo-radius-sm)' }}>
      <span style={{ fontSize: 13, color: 'var(--fo-text-dim)' }}>{label}</span>
      <span className={good ? 'fo-badge fo-badge-green' : 'fo-badge fo-badge-amber'}>{value}</span>
    </div>
  );
}
