// pages/app/pricesheets.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Logo from '../../components/Logo';
import ProductIcon from '../../components/ProductIcon';
import { supabase } from '../../lib/supabaseClient';
import { getClusterImage, getSingleImage, DECORATIVE_IMAGES } from '../../lib/productImages';

// Structured as a plain array so new regions can be added later without
// touching the dropdown logic itself.
const REGIONS = ['West Coast', 'East Coast', 'Mexico'];

const BASIS_OPTIONS = [
  { value: 'per_case', label: 'Per Case' },
  { value: 'per_pallet', label: 'Per Pallet' },
  { value: 'per_load', label: 'Per Load (enter $/case equivalent)' },
  { value: 'flat', label: 'Flat (enter $/case equivalent)' },
  { value: 'percentage', label: '% of Raw Cost' },
];

export default function PriceWorksheetPage() {
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [lines, setLines] = useState([]);
  const [feesByLine, setFeesByLine] = useState({});
  const [recipients, setRecipients] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allQuotes, setAllQuotes] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [printMode, setPrintMode] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLineForm, setNewLineForm] = useState({ product_id: '', supplier_id: '', cost_price: '', margin_pct: 20, markup_type: 'percent', markup_dollar: 0 });
  const [convertingLineId, setConvertingLineId] = useState(null);
  const [convertForm, setConvertForm] = useState({ mode: 'existing', existingOrderId: '', newAcumaticaNo: '', newCustomerId: '', newCustomerPO: '', cases: '', pricingType: 'FOB' });
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedOfferKeys, setSelectedOfferKeys] = useState(new Set());
  const [userEmail, setUserEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [editingLinks, setEditingLinks] = useState(false);
  const [linksForm, setLinksForm] = useState({ website: '', portal: '' });

  useEffect(() => { loadSheets(); loadCustomers(); loadQuotes(); loadProducts(); loadSuppliers(); loadOpenOrders(); loadUser(); loadLinks(); }, []);
  useEffect(() => { if (activeSheetId) loadDetail(activeSheetId); }, [activeSheetId]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserEmail(user?.email || '');
  }
  async function loadLinks() {
    const { data } = await supabase.from('app_settings').select('key, value').in('key', ['profresh_website_url', 'customer_portal_url']);
    const map = {};
    (data || []).forEach(r => { map[r.key] = r.value; });
    setWebsiteUrl(map.profresh_website_url || '');
    setPortalUrl(map.customer_portal_url || '');
  }
  function openEditLinks() { setLinksForm({ website: websiteUrl, portal: portalUrl }); setEditingLinks(true); }
  async function saveLinks() {
    await supabase.from('app_settings').upsert([
      { key: 'profresh_website_url', value: linksForm.website || '' },
      { key: 'customer_portal_url', value: linksForm.portal || '' },
    ]);
    setWebsiteUrl(linksForm.website); setPortalUrl(linksForm.portal);
    setEditingLinks(false);
  }

  async function loadSheets() {
    const { data } = await supabase.from('price_sheets').select('*').order('sheet_date', { ascending: false }).order('price_sheet_id', { ascending: false });
    setSheets(data || []);
    if (data && data.length && !activeSheetId) setActiveSheetId(data[0].price_sheet_id);
  }
  async function loadCustomers() {
    const { data } = await supabase.from('customers').select('customer_id, company, email, phone').order('company');
    setCustomers(data || []);
  }
  async function loadProducts() {
    const { data } = await supabase.from('products').select('product_id, commodity, pack_size, cases_per_pallet').order('commodity');
    setProducts(data || []);
  }
  async function loadSuppliers() {
    const { data } = await supabase.from('suppliers').select('supplier_id, company, per_case_fee').order('company');
    setSuppliers(data || []);
  }
  async function loadOpenOrders() {
    const { data } = await supabase.from('customer_orders').select('customer_order_id, acumatica_order_no, customers(company)').eq('order_status', 'Open').order('acumatica_order_no');
    setOpenOrders(data || []);
  }
  async function loadQuotes() {
    const { data } = await supabase
      .from('call_log')
      .select('*, suppliers(company, per_case_fee), products(commodity, pack_size)')
      .not('price', 'is', null)
      .eq('party_type', 'Supplier')
      .order('created_at', { ascending: false });
    setAllQuotes(data || []);
  }
  async function loadDetail(sheetId) {
    const { data: l } = await supabase.from('price_sheet_lines').select('*, products(commodity, pack_size, cases_per_pallet), suppliers(company, per_case_fee)').eq('price_sheet_id', sheetId).order('price_sheet_line_id');
    setLines(l || []);
    const lineIds = (l || []).map(x => x.price_sheet_line_id);
    if (lineIds.length) {
      const { data: fees } = await supabase.from('price_sheet_line_fees').select('*').in('price_sheet_line_id', lineIds).order('fee_id');
      const grouped = {};
      (fees || []).forEach(f => { grouped[f.price_sheet_line_id] = grouped[f.price_sheet_line_id] || []; grouped[f.price_sheet_line_id].push(f); });
      setFeesByLine(grouped);
    } else {
      setFeesByLine({});
    }
    const { data: r } = await supabase.from('price_sheet_recipients').select('*').eq('price_sheet_id', sheetId);
    setRecipients(r || []);
  }

  async function createFromLatestQuotes() {
    const byProduct = {};
    allQuotes.forEach(q => { if (!byProduct[q.product_id] || q.price < byProduct[q.product_id].price) byProduct[q.product_id] = q; });
    const productIds = Object.keys(byProduct);
    if (productIds.length === 0) { alert('No supplier price quotes logged yet — add some in Market Calls first.'); return; }

    const validThrough = new Date(); validThrough.setDate(validThrough.getDate() + 4);
    const { data: sheet, error: sheetErr } = await supabase.from('price_sheets').insert({
      sheet_date: new Date().toISOString().slice(0, 10),
      valid_through: validThrough.toISOString().slice(0, 10),
      notes: 'Auto-built from latest supplier quotes — swap any line to a different quote as needed'
    }).select().single();
    if (sheetErr) { alert('Could not create sheet: ' + sheetErr.message); return; }

    const newLines = productIds.map(pid => ({
      price_sheet_id: sheet.price_sheet_id,
      product_id: Number(pid),
      supplier_id: byProduct[pid].supplier_id,
      cost_price: byProduct[pid].price,
      margin_pct: 20,
      markup_type: 'percent',
      markup_dollar: 0,
      est_carrier_cost_per_pallet: 0,
      customer_freight_per_case: 0,
      source_call_id: byProduct[pid].call_id,
    }));
    const { data: insertedLines, error: linesErr } = await supabase.from('price_sheet_lines').insert(newLines).select();
    if (linesErr) { alert('Sheet created, but lines failed: ' + linesErr.message); }
    const feeRows = (insertedLines || []).map(line => {
      const sup = suppliers.find(s => s.supplier_id === line.supplier_id);
      if (!sup?.per_case_fee) return null;
      return { price_sheet_line_id: line.price_sheet_line_id, description: 'Supplier Fee', amount: sup.per_case_fee, basis: 'per_case' };
    }).filter(Boolean);
    if (feeRows.length) await supabase.from('price_sheet_line_fees').insert(feeRows);

    await loadSheets();
    setActiveSheetId(sheet.price_sheet_id);
  }

  async function updateLine(lineId, field, value) {
    const { error } = await supabase.from('price_sheet_lines').update({ [field]: value }).eq('price_sheet_line_id', lineId);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }
  async function switchQuote(line, callId) {
    const quote = allQuotes.find(q => q.call_id === Number(callId));
    if (!quote) return;
    const { error } = await supabase.from('price_sheet_lines').update({
      supplier_id: quote.supplier_id, cost_price: quote.price, source_call_id: quote.call_id
    }).eq('price_sheet_line_id', line.price_sheet_line_id);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }

  // ---- flexible fee line items ----
  async function addFee(lineId) {
    const { error } = await supabase.from('price_sheet_line_fees').insert({ price_sheet_line_id: lineId, description: '', amount: 0, basis: 'per_case' });
    if (error) { alert('Failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }
  async function updateFee(feeId, field, value) {
    const { error } = await supabase.from('price_sheet_line_fees').update({ [field]: value }).eq('fee_id', feeId);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }
  async function deleteFee(feeId) {
    const { error } = await supabase.from('price_sheet_line_fees').delete().eq('fee_id', feeId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }

  function openAddLine() { setNewLineForm({ product_id: '', supplier_id: '', cost_price: '', margin_pct: 20, markup_type: 'percent', markup_dollar: 0 }); setShowAddLine(true); }
  function pickProductForNewLine(productId) {
    const quote = allQuotes.find(q => q.product_id === Number(productId));
    setNewLineForm({ ...newLineForm, product_id: productId, supplier_id: quote?.supplier_id || '', cost_price: quote?.price ?? '' });
  }
  async function saveNewLine() {
    if (!newLineForm.product_id) { alert('Pick a product.'); return; }
    const payload = {
      price_sheet_id: activeSheetId,
      product_id: Number(newLineForm.product_id),
      supplier_id: newLineForm.supplier_id ? Number(newLineForm.supplier_id) : null,
      cost_price: newLineForm.cost_price ? Number(newLineForm.cost_price) : 0,
      margin_pct: Number(newLineForm.margin_pct || 0),
      markup_type: newLineForm.markup_type,
      markup_dollar: Number(newLineForm.markup_dollar || 0),
    };
    const { data: newLine, error } = await supabase.from('price_sheet_lines').insert(payload).select().single();
    if (error) { alert('Save failed: ' + error.message); return; }
    // If the chosen supplier has a standard per-case fee on file, start the
    // line off with that fee already applied rather than making Julio
    // re-look-it-up and type it in by hand — still fully editable after.
    if (payload.supplier_id) {
      const sup = suppliers.find(s => s.supplier_id === payload.supplier_id);
      if (sup?.per_case_fee) {
        await supabase.from('price_sheet_line_fees').insert({ price_sheet_line_id: newLine.price_sheet_line_id, description: 'Supplier Fee', amount: sup.per_case_fee, basis: 'per_case' });
      }
    }
    setShowAddLine(false);
    loadDetail(activeSheetId);
  }
  async function deleteLine(lineId) {
    if (!confirm('Remove this item from the sheet?')) return;
    await supabase.from('price_sheet_line_fees').delete().eq('price_sheet_line_id', lineId);
    const { error } = await supabase.from('price_sheet_lines').delete().eq('price_sheet_line_id', lineId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }
  async function deleteSheet(sheetId) {
    if (!confirm('Delete this entire price sheet? This removes all its lines, fees, and recipient records too — cannot be undone.')) return;
    const { data: l } = await supabase.from('price_sheet_lines').select('price_sheet_line_id').eq('price_sheet_id', sheetId);
    const lineIds = (l || []).map(x => x.price_sheet_line_id);
    if (lineIds.length) await supabase.from('price_sheet_line_fees').delete().in('price_sheet_line_id', lineIds);
    await supabase.from('price_sheet_lines').delete().eq('price_sheet_id', sheetId);
    await supabase.from('price_sheet_recipients').delete().eq('price_sheet_id', sheetId);
    const { error } = await supabase.from('price_sheets').delete().eq('price_sheet_id', sheetId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    const { data } = await supabase.from('price_sheets').select('*').order('sheet_date', { ascending: false }).order('price_sheet_id', { ascending: false });
    setSheets(data || []);
    setActiveSheetId(data && data.length ? data[0].price_sheet_id : null);
  }

  async function saveSnapshot() {
    if (!activeSheet) return;
    if (!confirm('Save a permanent copy of this price sheet? This freezes today\'s numbers into the Customer and Supplier profile histories — editing the live sheet later won\'t change this saved copy.')) return;

    const { data: snap, error: snapErr } = await supabase.from('price_sheet_snapshots').insert({
      price_sheet_id: activeSheet.price_sheet_id, sheet_date: activeSheet.sheet_date, valid_through: activeSheet.valid_through,
    }).select().single();
    if (snapErr) { alert('Could not save: ' + snapErr.message); return; }

    const snapshotLines = lines.map(l => ({
      snapshot_id: snap.snapshot_id, product_id: l.product_id, supplier_id: l.supplier_id,
      commodity: l.products?.commodity, pack_size: l.products?.pack_size,
      raw_cost: l.cost_price, fee_total: feeTotalPerCase(l), internal_cost: internalCost(l),
      customer_fob: customerFOB(l), customer_delivered: customerDelivered(l),
      est_carrier_cost_per_pallet: l.est_carrier_cost_per_pallet, customer_freight_per_case: l.customer_freight_per_case,
    }));
    if (snapshotLines.length) {
      const { error } = await supabase.from('price_sheet_snapshot_lines').insert(snapshotLines);
      if (error) { alert('Sheet saved, but lines failed: ' + error.message); }
    }

    const snapshotRecipients = recipients.map(r => ({
      snapshot_id: snap.snapshot_id, customer_id: r.customer_id, contact_email: r.contact_email, contact_phone: r.contact_phone,
    }));
    if (snapshotRecipients.length) {
      const { error } = await supabase.from('price_sheet_snapshot_recipients').insert(snapshotRecipients);
      if (error) { alert('Sheet saved, but recipients failed: ' + error.message); }
    }
    alert('Saved — this copy is now on file in each customer and supplier profile.');
  }

  async function toggleRecipient(customer) {
    const existing = recipients.find(r => r.customer_id === customer.customer_id);
    if (existing) {
      await supabase.from('price_sheet_recipients').delete().eq('price_sheet_recipient_id', existing.price_sheet_recipient_id);
    } else {
      const { error } = await supabase.from('price_sheet_recipients').insert({
        price_sheet_id: activeSheetId, customer_id: customer.customer_id,
        contact_email: customer.email || null, contact_phone: customer.phone || null
      });
      if (error) { alert('Failed: ' + error.message); return; }
    }
    loadDetail(activeSheetId);
  }
  async function updateRecipientContact(id, field, value) {
    const { error } = await supabase.from('price_sheet_recipients').update({ [field]: value }).eq('price_sheet_recipient_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }

  // ---- pricing math ----
  function feeTotalPerCase(line) {
    const fees = feesByLine[line.price_sheet_line_id] || [];
    const perPallet = line.products?.cases_per_pallet || null;
    return fees.reduce((sum, f) => {
      const amt = Number(f.amount || 0);
      if (f.basis === 'per_case') return sum + amt;
      if (f.basis === 'per_pallet') return sum + (perPallet ? amt / perPallet : 0);
      if (f.basis === 'percentage') return sum + (Number(line.cost_price || 0) * amt / 100);
      // flat / per_load: entered directly as a $/case-equivalent, since a
      // worksheet line isn't tied to a specific order quantity yet
      return sum + amt;
    }, 0);
  }
  function internalCost(line) { return Number(line.cost_price || 0) + feeTotalPerCase(line); }
  function baseWithFreight(line) { return internalCost(line) + Number(line.customer_freight_per_case || 0); }
  function customerDelivered(line) {
    const base = baseWithFreight(line);
    return line.markup_type === 'dollar' ? base + Number(line.markup_dollar || 0) : base * (1 + Number(line.margin_pct || 0) / 100);
  }
  function customerFOB(line) { return customerDelivered(line) - Number(line.customer_freight_per_case || 0); }

  // ---- convert to order ----
  function openConvert(line) {
    setConvertForm({ mode: 'existing', existingOrderId: '', newAcumaticaNo: '', newCustomerId: '', newCustomerPO: '', cases: '', pricingType: 'FOB' });
    setConvertingLineId(line.price_sheet_line_id);
  }
  async function saveConvert(line) {
    if (!line.supplier_id) { alert('This line has no supplier set — pick a quote or edit the line before creating an order from it.'); return; }
    if (!convertForm.cases || Number(convertForm.cases) <= 0) { alert('Enter how many cases.'); return; }

    let orderId = convertForm.existingOrderId ? Number(convertForm.existingOrderId) : null;
    if (convertForm.mode === 'new') {
      if (!convertForm.newCustomerId) { alert('New order needs a Customer.'); return; }
      const { data: newOrder, error: orderErr } = await supabase.from('customer_orders').insert({
        acumatica_order_no: convertForm.newAcumaticaNo || null, customer_id: Number(convertForm.newCustomerId),
        customer_po: convertForm.newCustomerPO || null, order_date: new Date().toISOString().slice(0, 10),
        order_status: 'Open', source: 'Internal',
      }).select().single();
      if (orderErr) { alert('Could not create order: ' + orderErr.message); return; }
      orderId = newOrder.customer_order_id;
    }
    if (!orderId) { alert('Pick an existing order, or switch to "Start a new order".'); return; }

    const price = convertForm.pricingType === 'FOB' ? customerFOB(line) : customerDelivered(line);
    const cost = internalCost(line);
    const snapshot = {
      raw_cost: line.cost_price, fee_total: feeTotalPerCase(line), internal_cost: cost,
      customer_fob: customerFOB(line), customer_delivered: customerDelivered(line),
      pricing_type: convertForm.pricingType, customer_freight_per_case: line.customer_freight_per_case,
      margin_estimate: price - cost, quote_date: sheets.find(s => s.price_sheet_id === activeSheetId)?.sheet_date || null,
    };
    const cases = Number(convertForm.cases);
    const { error } = await supabase.from('order_lines').insert({
      customer_order_id: orderId, supplier_id: line.supplier_id, product_id: line.product_id,
      cases_ordered: cases, original_cases_ordered: cases,
      sell_price_per_case: price, original_sell_price_per_case: price,
      fob_cost_per_case: cost, original_fob_cost_per_case: cost,
      pricing_type: convertForm.pricingType, line_status: 'Open',
      source_price_sheet_line_id: line.price_sheet_line_id, price_snapshot: snapshot,
    });
    if (error) { alert('Could not create order line: ' + error.message); return; }
    alert('Order line created.');
    setConvertingLineId(null);
    loadOpenOrders();
  }

  const activeSheet = sheets.find(s => s.price_sheet_id === activeSheetId);

  // ---- Price Sheet Builder — select from current supplier offers ----
  const currentOffers = {};
  allQuotes.forEach(q => {
    const key = `${q.supplier_id}-${q.product_id}`;
    if (!currentOffers[key]) currentOffers[key] = q; // allQuotes is already newest-first
  });
  const currentOfferList = Object.values(currentOffers).sort((a, b) => (a.products?.commodity || '').localeCompare(b.products?.commodity || ''));

  function toggleOffer(key) {
    const next = new Set(selectedOfferKeys);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelectedOfferKeys(next);
  }
  async function addSelectedToSheet() {
    if (selectedOfferKeys.size === 0) { alert('Select at least one offer.'); return; }
    let sheetId = activeSheetId;
    if (!sheetId) {
      const validThrough = new Date(); validThrough.setDate(validThrough.getDate() + 4);
      const { data: sheet, error: sheetErr } = await supabase.from('price_sheets').insert({
        sheet_date: new Date().toISOString().slice(0, 10), valid_through: validThrough.toISOString().slice(0, 10),
      }).select().single();
      if (sheetErr) { alert('Could not create sheet: ' + sheetErr.message); return; }
      sheetId = sheet.price_sheet_id;
    }
    const newLines = [...selectedOfferKeys].map(key => {
      const q = currentOffers[key];
      return {
        price_sheet_id: sheetId, product_id: q.product_id, supplier_id: q.supplier_id, cost_price: q.price,
        margin_pct: 20, markup_type: 'percent', markup_dollar: 0, est_carrier_cost_per_pallet: 0, customer_freight_per_case: 0,
        source_call_id: q.call_id,
      };
    });
    const { data: insertedLines, error } = await supabase.from('price_sheet_lines').insert(newLines).select();
    if (error) { alert('Could not add lines: ' + error.message); return; }
    // Same default-fee auto-fill as the manual Add Line flow — start each
    // line with its supplier's standard fee already applied, still editable.
    const feeRows = (insertedLines || []).map(line => {
      const sup = suppliers.find(s => s.supplier_id === line.supplier_id);
      if (!sup?.per_case_fee) return null;
      return { price_sheet_line_id: line.price_sheet_line_id, description: 'Supplier Fee', amount: sup.per_case_fee, basis: 'per_case' };
    }).filter(Boolean);
    if (feeRows.length) await supabase.from('price_sheet_line_fees').insert(feeRows);
    setSelectedOfferKeys(new Set());
    setShowBuilder(false);
    await loadSheets();
    setActiveSheetId(sheetId);
    await loadDetail(sheetId);
  }

  if (printMode && activeSheet) {
    return (
      <AppShell title="Customer Price Sheet">
        <style jsx global>{`
          @media print {
            .print-full-width { padding: 0 !important; margin: 0 !important; }
            .fo-pricesheet-table thead { display: table-header-group; }
            .fo-pricesheet-table tr { page-break-inside: avoid; break-inside: avoid; }
            .fo-pricesheet-corner-lemon { top: -45px; left: -45px; width: 270px; height: 270px; }
            .fo-pricesheet-corner-orange { top: -45px; right: -45px; width: 285px; height: 285px; }
            .fo-pricesheet-crate { height: 110px !important; }
            @page { size: letter landscape; margin: 0.4in; }
            body, .print-full-width {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        `}</style>
        <div className="no-print" style={{ marginBottom: 16 }}>
          <button onClick={() => setPrintMode(false)} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginRight: 8 }}>← Back to Price Sheets</button>
          <button onClick={() => window.print()} style={{ ...btn, marginRight: 8 }}>🖨 Print</button>
          <button onClick={openEditLinks} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>🔗 Edit Links</button>
          {editingLinks && (
            <div style={{ ...card, marginTop: 12, maxWidth: 480 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fo-primary)', marginBottom: 8 }}>Price Sheet Links</div>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>ProFresh Sourcing Website (logo links here)
                <input value={linksForm.website} onChange={e => setLinksForm({ ...linksForm, website: e.target.value })} placeholder="https://..." style={{ display: 'block', width: '100%', marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Customer Portal (bottom button links here)
                <input value={linksForm.portal} onChange={e => setLinksForm({ ...linksForm, portal: e.target.value })} placeholder="https://..." style={{ display: 'block', width: '100%', marginTop: 4 }} />
              </label>
              <button onClick={saveLinks} style={{ ...btn, background: 'var(--fo-accent)', marginRight: 8 }}>Save</button>
              <button onClick={() => setEditingLinks(false)} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>Cancel</button>
            </div>
          )}
        </div>
        {/* Customer-facing — always light and professional, independent of
            any internal Command Center Dark preference. ProFresh Sourcing
            is the primary brand here; FreshOps stays small and discreet. */}
        <div className="print-full-width" style={{ background: '#FFFEFB', border: '1px solid #E5DFC8', borderRadius: 16, boxShadow: '0 1px 8px rgba(15,20,15,.06)', padding: 0, overflow: 'hidden', position: 'relative' }}>
          {/* Decorative corner framing — leaves left, oranges right, upper
              corners only. Behind all content, clipped by the rounded
              outer edge, never covering logo/dates/pricing/CTA. */}
          <img src={DECORATIVE_IMAGES.lemon} alt="" className="fo-pricesheet-corner fo-pricesheet-corner-lemon" onError={e => { e.target.style.display = 'none'; }} />
          <img src={DECORATIVE_IMAGES.orange} alt="" className="fo-pricesheet-corner fo-pricesheet-corner-orange" onError={e => { e.target.style.display = 'none'; }} />

          <div style={{ background: 'transparent', padding: '28px 32px 20px', textAlign: 'center', borderBottom: '3px solid #168A45', position: 'relative', zIndex: 1 }}>
            {websiteUrl ? (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                <img src="/brand/profresh-sourcing-logo.png" alt="ProFresh Sourcing" style={{ height: 56, width: 'auto', position: 'relative' }} />
              </a>
            ) : (
              <img src="/brand/profresh-sourcing-logo.png" alt="ProFresh Sourcing" style={{ height: 56, width: 'auto', position: 'relative' }} />
            )}
            <div style={{ color: '#5F6763', fontSize: 13, marginTop: 10, position: 'relative' }}>Fresh Produce. Simplified Sourcing.</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12, margin: '16px 32px', padding: '10px 20px', background: '#F3F5EC', border: '1px solid #D9E5D3', borderRadius: 14, boxShadow: '0 1px 6px rgba(15,20,15,.05)', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #D9E5D3', borderRadius: 999, padding: '5px 14px', fontSize: 12 }}>
              <span style={{ color: '#168A45' }}>📅</span> <strong style={{ color: '#168A45' }}>Date:</strong> {activeSheet.sheet_date}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #D9E5D3', borderRadius: 999, padding: '5px 14px', fontSize: 12 }}>
              <span style={{ color: '#168A45' }}>🕐</span> <strong style={{ color: '#168A45' }}>Valid Through:</strong> {activeSheet.valid_through}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FFFDF7', border: '1.5px solid #168A45', borderRadius: 999, padding: '7px 18px', fontSize: 14, fontWeight: 700, color: '#14562F', boxShadow: '0 0 0 3px rgba(217,118,12,.07)' }}>
              <span style={{ fontSize: 16 }}>💬</span> Se habla español
            </div>
          </div>
          <div style={{ padding: '18px 24px 24px', position: 'relative', zIndex: 1 }}>
            <div style={{ border: '1px solid #D9E5D3', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,20,15,.05)' }}>
            <div style={{ overflowX: 'auto' }}>
            <table className="fo-pricesheet-table" style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead><tr style={{ textAlign: 'left', color: '#fff', background: '#14562F' }}>
                <th style={{ padding: '10px 8px', width: 52, borderRight: '1px solid rgba(255,255,255,.12)' }}></th>
                <th style={{ padding: '10px 8px', fontSize: 12, letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.12)' }}>COMMODITY</th>
                <th style={{ padding: '10px 8px', fontSize: 12, letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.12)' }}>PACK / SIZE</th>
                <th style={{ padding: '10px 8px', fontSize: 12, letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.12)' }}>REGION</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: 12, letterSpacing: '.03em', borderRight: '1px solid rgba(255,255,255,.12)' }}>FOB $ / CS</th>
                <th style={{ padding: '10px 10px', textAlign: 'right', background: '#168A45', fontSize: 12, letterSpacing: '.03em' }}>DELIVERED $ / CS</th>
              </tr></thead>
              <tbody>{lines.map((l, i) => {
                const img = getClusterImage(l.products?.commodity);
                return (
                <tr key={l.price_sheet_line_id} style={{ borderBottom: '1px solid #EFEEE1', background: i % 2 === 1 ? '#FBFAF3' : 'transparent' }}>
                  <td style={{ padding: '7px 8px', borderRight: '1px solid #EFEEE1' }}>
                    {img ? (
                      <img src={img} alt="" style={{ width: 48, height: 48, objectFit: 'contain', display: 'block' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: '#EAF3E4', display: img ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#B7D9BE' }} />
                    </div>
                  </td>
                  <td style={{ padding: '7px 8px', fontWeight: 600, borderRight: '1px solid #EFEEE1' }}>{l.products?.commodity}</td>
                  <td style={{ padding: '7px 8px', color: '#6A746D', borderRight: '1px solid #EFEEE1' }}>{l.products?.pack_size}</td>
                  <td style={{ padding: '7px 8px', borderRight: '1px solid #EFEEE1' }}>{l.region && <RegionPill region={l.region} />}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: '#3F453F', borderRight: '1px solid #EFEEE1' }}>${customerFOB(l).toFixed(2)}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, fontSize: 14.5, color: '#0F6834', background: '#EFF9F1' }}>${customerDelivered(l).toFixed(2)}</td>
                </tr>
                );
              })}</tbody>
            </table>
            </div>
            </div>
            <div style={{ fontSize: 11, color: '#9BA39C', marginTop: 10 }}>Pricing subject to market availability and freight conditions.</div>
          </div>
          {portalUrl && (
            <div style={{ padding: '0 32px 24px' }}>
              <div style={{ background: '#F3F5EC', border: '1px solid #D9E5D3', borderRadius: 14, boxShadow: '0 1px 6px rgba(15,20,15,.05)', padding: '18px 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', border: '1.5px solid #B7D9BE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, margin: '0 auto 8px' }}>🛒</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#14562F' }}>
                    <span style={{ color: '#D9760C' }}>—</span> Ready to place an order? <span style={{ color: '#D9760C' }}>—</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6A746D', marginTop: 4, marginBottom: 14 }}>Access the ProFresh Sourcing Customer Portal to view your account and submit your order.</div>
                  <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#D9760C', color: '#fff', fontSize: 13, fontWeight: 700, padding: '11px 24px', borderRadius: 999, textDecoration: 'none' }}>
                    Contact Sales / Access Customer Portal
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>→</span>
                  </a>
                </div>
                <img src={DECORATIVE_IMAGES.crateFull} alt="" className="fo-pricesheet-crate" style={{ height: 190, width: 'auto' }} onError={e => { e.target.style.display = 'none'; }} />
              </div>
            </div>
          )}
          <div style={{ background: '#14562F', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', fontSize: 11.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,.85)' }}>
              Prepared with <strong style={{ color: '#fff' }}>FreshOps</strong> Business Intelligence
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,.6)', fontSize: 10.5, fontWeight: 400 }}>
              💬 Se habla español
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Price Sheets">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {sheets.map(s => (
          <button key={s.price_sheet_id} onClick={() => setActiveSheetId(s.price_sheet_id)}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: '1px solid var(--fo-border)', background: activeSheetId === s.price_sheet_id ? 'var(--fo-primary)' : 'var(--fo-card-bg)', color: activeSheetId === s.price_sheet_id ? '#fff' : 'var(--fo-text)' }}>
            {s.sheet_date}
          </button>
        ))}
        <button onClick={createFromLatestQuotes} style={btn}>+ New Sheet from Latest Quotes</button>
        <button onClick={() => setShowBuilder(!showBuilder)} style={{ ...btn, background: 'var(--fo-accent)' }}>+ Price Sheet Builder</button>
      </div>
      {showBuilder && (
        <div style={{ ...card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fo-primary)', marginBottom: 8 }}>Select current supplier offers to add {activeSheet ? `to today's sheet (${activeSheet.sheet_date})` : '— this will start a new sheet'}</div>
          {currentOfferList.length === 0 ? (
            <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No supplier prices logged yet — capture some in Market Calls first.</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {currentOfferList.map(q => {
                const key = `${q.supplier_id}-${q.product_id}`;
                return (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--fo-border-soft)', fontSize: 13.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedOfferKeys.has(key)} onChange={() => toggleOffer(key)} />
                    <span>{q.products?.commodity} | {q.products?.pack_size} | {q.suppliers?.company} | ${Number(q.price).toFixed(2)} FOB</span>
                  </label>
                );
              })}
            </div>
          )}
          <button onClick={addSelectedToSheet} style={{ ...btn, marginTop: 12, background: 'var(--fo-accent)' }}>Add Selected to Price Sheet</button>
          <button onClick={() => { setShowBuilder(false); setSelectedOfferKeys(new Set()); }} style={{ ...btn, marginTop: 12, marginLeft: 8, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>Cancel</button>
        </div>
      )}
      <div style={{ color: 'var(--fo-text-dim)', fontSize: 13, marginBottom: 16 }}>Market Calls → Price Sheets → Customer Price Sheet → Customer Order. Add as many fee line items as you need per commodity — cooling, inspection, commission, whatever applies. Freight is tracked separately from product markup.</div>

      {activeSheet ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2.8fr 1fr', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: 'var(--fo-primary)' }}>Sheet — valid through {activeSheet.valid_through}</strong>
              <div>
                <button onClick={saveSnapshot} style={{ ...btn, marginBottom: 0, background: 'var(--fo-accent)' }}>Save Price Sheet</button>
                <button onClick={() => setPrintMode(true)} style={{ ...btn, marginBottom: 0, marginLeft: 8, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>Customer Price Sheet / Print</button>
                <button onClick={() => deleteSheet(activeSheet.price_sheet_id)} style={{ ...btn, marginBottom: 0, marginLeft: 8, background: 'var(--fo-card-bg)', color: 'var(--fo-error)', border: '1px solid var(--fo-border)' }}>Delete Sheet</button>
              </div>
            </div>

            {lines.map(l => {
              const options = allQuotes.filter(q => q.product_id === l.product_id);
              const fees = feesByLine[l.price_sheet_line_id] || [];
              return (
                <div key={l.price_sheet_line_id} style={{ ...card, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ProductIcon commodity={l.products?.commodity} size={22} />
                        <strong style={{ color: 'var(--fo-primary)' }}>{l.products?.commodity} — {l.products?.pack_size}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>
                        RAW MARKET PRICE — {l.suppliers?.company || 'no supplier set'} · ${Number(l.cost_price || 0).toFixed(2)}/cs
                        {options.length > 1 && (
                          <select value={l.source_call_id || ''} onChange={e => switchQuote(l, e.target.value)} style={{ fontSize: 11, marginLeft: 8 }}>
                            {options.map(q => <option key={q.call_id} value={q.call_id}>{q.call_date} — {q.suppliers?.company} — ${Number(q.price).toFixed(2)}</option>)}
                          </select>
                        )}
                      </div>
                      <select value={l.region || ''} onChange={e => updateLine(l.price_sheet_line_id, 'region', e.target.value || null)} style={{ fontSize: 11.5, marginTop: 6, padding: '3px 6px' }}>
                        <option value="">Region — not set</option>
                        {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <button onClick={() => openConvert(l)} style={{ ...btn, marginBottom: 0, background: 'var(--fo-accent)' }}>Create / Add to Order</button>
                      <button onClick={() => deleteLine(l.price_sheet_line_id)} style={{ ...editBtn, marginLeft: 8 }}>Remove</button>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: 'var(--fo-text-dim)' }}>VARIABLE COSTS</div>
                  {fees.length === 0 && <div style={{ fontSize: 12, color: 'var(--fo-text-faint)' }}>No fees added.</div>}
                  {fees.map(f => (
                    <div key={f.fee_id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                      <input placeholder="Description (e.g. cooling)" defaultValue={f.description} onBlur={e => updateFee(f.fee_id, 'description', e.target.value)} style={{ ...selectStyle, flex: 2, marginTop: 0 }} />
                      <input type="number" placeholder="Amount" defaultValue={f.amount} onBlur={e => updateFee(f.fee_id, 'amount', Number(e.target.value))} style={{ ...selectStyle, width: 90, marginTop: 0 }} />
                      <select value={f.basis} onChange={e => updateFee(f.fee_id, 'basis', e.target.value)} style={{ ...selectStyle, flex: 1.5, marginTop: 0 }}>
                        {BASIS_OPTIONS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                      <button onClick={() => deleteFee(f.fee_id)} style={editBtn}>✕</button>
                    </div>
                  ))}
                  <button onClick={() => addFee(l.price_sheet_line_id)} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 12, cursor: 'pointer', marginTop: 6, padding: 0 }}>+ Add Fee</button>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--fo-border)' }}>
                    <div>
                      <div style={miniLabel}>Internal Cost</div>
                      <div style={{ fontWeight: 700 }}>${internalCost(l).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={miniLabel}>Markup</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <select value={l.markup_type} onChange={e => updateLine(l.price_sheet_line_id, 'markup_type', e.target.value)} style={{ fontSize: 12 }}>
                          <option value="percent">%</option><option value="dollar">$</option>
                        </select>
                        {l.markup_type === 'dollar' ? (
                          <input type="number" defaultValue={l.markup_dollar} onBlur={e => updateLine(l.price_sheet_line_id, 'markup_dollar', Number(e.target.value))} style={{ width: 60 }} />
                        ) : (
                          <input type="number" defaultValue={l.margin_pct} onBlur={e => updateLine(l.price_sheet_line_id, 'margin_pct', Number(e.target.value))} style={{ width: 60 }} />
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={miniLabel}>Customer FOB</div>
                      <div style={{ fontWeight: 700, color: 'var(--fo-primary)' }}>${customerFOB(l).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={miniLabel}>Raw Cost / cs</div>
                      <input type="number" defaultValue={l.cost_price} onBlur={e => updateLine(l.price_sheet_line_id, 'cost_price', Number(e.target.value))} style={{ width: 70 }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--fo-border)' }}>
                    <div>
                      <div style={miniLabel}>FREIGHT — Est. Carrier Cost / pallet</div>
                      <input type="number" defaultValue={l.est_carrier_cost_per_pallet} onBlur={e => updateLine(l.price_sheet_line_id, 'est_carrier_cost_per_pallet', Number(e.target.value))} style={{ width: 80 }} />
                      <div style={{ fontSize: 10, color: 'var(--fo-text-faint)', marginTop: 2, minHeight: 13 }}>
                        {l.products?.cases_per_pallet && l.est_carrier_cost_per_pallet ? `≈ $${(Number(l.est_carrier_cost_per_pallet) / l.products.cases_per_pallet).toFixed(2)}/case` : '\u00A0'}
                      </div>
                    </div>
                    <div>
                      <div style={miniLabel}>Customer Freight Charge / cs</div>
                      <input type="number" defaultValue={l.customer_freight_per_case} onBlur={e => updateLine(l.price_sheet_line_id, 'customer_freight_per_case', Number(e.target.value))} style={{ width: 80 }} />
                    </div>
                    <div>
                      <div style={miniLabel}>Customer Delivered</div>
                      <div style={{ fontWeight: 700, color: 'var(--fo-primary)' }}>${customerDelivered(l).toFixed(2)}</div>
                    </div>
                  </div>

                  {convertingLineId === l.price_sheet_line_id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--fo-border)', background: 'var(--fo-section-bg)', padding: 12, borderRadius: 6 }}>
                      <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                        <label style={{ fontSize: 13 }}><input type="radio" checked={convertForm.mode === 'existing'} onChange={() => setConvertForm({ ...convertForm, mode: 'existing' })} /> Add to existing order</label>
                        <label style={{ fontSize: 13 }}><input type="radio" checked={convertForm.mode === 'new'} onChange={() => setConvertForm({ ...convertForm, mode: 'new' })} /> Start a new order</label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {convertForm.mode === 'existing' ? (
                          <label style={{ fontSize: 13 }}>Order
                            <select value={convertForm.existingOrderId} onChange={e => setConvertForm({ ...convertForm, existingOrderId: e.target.value })} style={selectStyle}>
                              <option value="">— select —</option>
                              {openOrders.map(o => <option key={o.customer_order_id} value={o.customer_order_id}>{o.acumatica_order_no} — {o.customers?.company}</option>)}
                            </select>
                          </label>
                        ) : (
                          <>
                            <label style={{ fontSize: 13 }}>Acumatica Order # (optional)<input value={convertForm.newAcumaticaNo} onChange={e => setConvertForm({ ...convertForm, newAcumaticaNo: e.target.value })} style={selectStyle} /></label>
                            <label style={{ fontSize: 13 }}>Customer
                              <select value={convertForm.newCustomerId} onChange={e => setConvertForm({ ...convertForm, newCustomerId: e.target.value })} style={selectStyle}>
                                <option value="">— select —</option>
                                {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.company}</option>)}
                              </select>
                            </label>
                            <label style={{ fontSize: 13 }}>Customer PO<input value={convertForm.newCustomerPO} onChange={e => setConvertForm({ ...convertForm, newCustomerPO: e.target.value })} style={selectStyle} /></label>
                          </>
                        )}
                        <label style={{ fontSize: 13 }}>Cases<input type="number" value={convertForm.cases} onChange={e => setConvertForm({ ...convertForm, cases: e.target.value })} style={selectStyle} /></label>
                        <label style={{ fontSize: 13 }}>Price Type
                          <select value={convertForm.pricingType} onChange={e => setConvertForm({ ...convertForm, pricingType: e.target.value })} style={selectStyle}>
                            <option value="FOB">FOB — ${customerFOB(l).toFixed(2)}</option>
                            <option value="Delivered">Delivered — ${customerDelivered(l).toFixed(2)}</option>
                          </select>
                        </label>
                      </div>
                      <button onClick={() => saveConvert(l)} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 10 }}>Save Order Line</button>
                      <button onClick={() => setConvertingLineId(null)} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 10, marginLeft: 8 }}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={openAddLine} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 4, padding: '4px 0' }}>+ Add Line</button>
            {showAddLine && (
              <div style={{ ...card, marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <label style={{ fontSize: 13 }}>Product
                  <select value={newLineForm.product_id} onChange={e => pickProductForNewLine(e.target.value)} style={selectStyle}>
                    <option value="">— select —</option>
                    {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 13 }}>Supplier
                  <select value={newLineForm.supplier_id} onChange={e => setNewLineForm({ ...newLineForm, supplier_id: e.target.value })} style={selectStyle}>
                    <option value="">— none —</option>
                    {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 13 }}>Raw Cost ($/cs)
                  <input type="number" value={newLineForm.cost_price} onChange={e => setNewLineForm({ ...newLineForm, cost_price: e.target.value })} style={selectStyle} />
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button onClick={saveNewLine} style={{ ...btn, marginBottom: 0, background: 'var(--fo-accent)' }}>Save Line</button>
                  <button onClick={() => setShowAddLine(false)} style={{ ...btn, marginBottom: 0, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <strong style={{ color: 'var(--fo-primary)' }}>Sent To</strong>
            <div style={{ marginTop: 8 }}>
              {customers.map(c => {
                const sent = recipients.find(r => r.customer_id === c.customer_id);
                return (
                  <div key={c.customer_id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid var(--fo-border)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input type="checkbox" checked={!!sent} onChange={() => toggleRecipient(c)} />
                      {c.company}
                    </label>
                    {sent && (
                      <div style={{ marginLeft: 24, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <input type="text" defaultValue={sent.contact_email || ''} placeholder="Email sent to" onBlur={e => updateRecipientContact(sent.price_sheet_recipient_id, 'contact_email', e.target.value)} style={{ fontSize: 12, padding: '3px 6px' }} />
                        <input type="text" defaultValue={sent.contact_phone || ''} placeholder="Phone / text sent to" onBlur={e => updateRecipientContact(sent.price_sheet_recipient_id, 'contact_phone', e.target.value)} style={{ fontSize: 12, padding: '3px 6px' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--fo-text-faint)' }}>No price sheets yet. Log some Market Calls with supplier quotes, then click "+ New Sheet from Latest Quotes."</p>
      )}
    </AppShell>
  );
}

const btn = { padding: '10px 18px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 'var(--fo-radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };
const editBtn = { padding: '6px 13px', fontSize: 12.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer', fontWeight: 500 };
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm), var(--fo-glow)', padding: 18 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
const selectStyle = { display: 'block', width: '100%', marginTop: 4 };
const miniLabel = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.03em', color: 'var(--fo-text-dim)', fontWeight: 600, marginBottom: 2 };

function RegionPill({ region }) {
  const colors = {
    'West Coast': '#168A45',
    'East Coast': '#2878C7',
    'Mexico': '#D9760C',
  };
  const c = colors[region] || '#8B928E';
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#fff', border: `1.5px solid ${c}`, color: c, whiteSpace: 'nowrap' }}>{region}</span>
  );
}
