// pages/app/pricesheets.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

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

  useEffect(() => { loadSheets(); loadCustomers(); loadQuotes(); loadProducts(); loadSuppliers(); loadOpenOrders(); }, []);
  useEffect(() => { if (activeSheetId) loadDetail(activeSheetId); }, [activeSheetId]);

  async function loadSheets() {
    const { data } = await supabase.from('price_sheets').select('*').order('sheet_date', { ascending: false });
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
      .order('call_date', { ascending: false });
    setAllQuotes(data || []);
  }
  async function loadDetail(sheetId) {
    const { data: l } = await supabase.from('price_sheet_lines').select('*, products(commodity, pack_size, cases_per_pallet), suppliers(company, per_case_fee)').eq('price_sheet_id', sheetId);
    setLines(l || []);
    const lineIds = (l || []).map(x => x.price_sheet_line_id);
    if (lineIds.length) {
      const { data: fees } = await supabase.from('price_sheet_line_fees').select('*').in('price_sheet_line_id', lineIds);
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
      est_carrier_cost_per_case: 0,
      customer_freight_per_case: 0,
      source_call_id: byProduct[pid].call_id,
    }));
    const { error: linesErr } = await supabase.from('price_sheet_lines').insert(newLines);
    if (linesErr) { alert('Sheet created, but lines failed: ' + linesErr.message); }

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
    const { error } = await supabase.from('price_sheet_lines').insert(payload);
    if (error) { alert('Save failed: ' + error.message); return; }
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
    const { data } = await supabase.from('price_sheets').select('*').order('sheet_date', { ascending: false });
    setSheets(data || []);
    setActiveSheetId(data && data.length ? data[0].price_sheet_id : null);
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
  function customerFOB(line) {
    const cost = internalCost(line);
    return line.markup_type === 'dollar' ? cost + Number(line.markup_dollar || 0) : cost * (1 + Number(line.margin_pct || 0) / 100);
  }
  function customerDelivered(line) { return customerFOB(line) + Number(line.customer_freight_per_case || 0); }

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
      if (!convertForm.newAcumaticaNo || !convertForm.newCustomerId) { alert('New order needs an Acumatica Order # and a Customer.'); return; }
      const { data: newOrder, error: orderErr } = await supabase.from('customer_orders').insert({
        acumatica_order_no: convertForm.newAcumaticaNo, customer_id: Number(convertForm.newCustomerId),
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

  if (printMode && activeSheet) {
    return (
      <AppShell title="Customer Price Sheet">
        <div className="no-print" style={{ marginBottom: 16 }}>
          <button onClick={() => setPrintMode(false)} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginRight: 8 }}>← Back to Price Worksheet</button>
          <button onClick={() => window.print()} style={btn}>🖨 Print</button>
        </div>
        <div style={card}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#2F5233' }}>FreshOps Produce Pricing</div>
          <div style={{ color: '#78716c', fontSize: 13, marginBottom: 12 }}>Valid through {activeSheet.valid_through}</div>
          <table style={table}>
            <thead><tr style={trHead}><th>Commodity</th><th>Pack / Size</th><th style={{ textAlign: 'right' }}>FOB $/cs</th><th style={{ textAlign: 'right' }}>Delivered $/cs</th></tr></thead>
            <tbody>{lines.map(l => (
              <tr key={l.price_sheet_line_id} style={tr}>
                <td>{l.products?.commodity}</td><td>{l.products?.pack_size}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2F5233' }}>${customerFOB(l).toFixed(2)}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2F5233' }}>${customerDelivered(l).toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Price Worksheet">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {sheets.map(s => (
          <button key={s.price_sheet_id} onClick={() => setActiveSheetId(s.price_sheet_id)}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: '1px solid #DCD5C1', background: activeSheetId === s.price_sheet_id ? '#2F5233' : '#fff', color: activeSheetId === s.price_sheet_id ? '#fff' : '#333' }}>
            {s.sheet_date}
          </button>
        ))}
        <button onClick={createFromLatestQuotes} style={btn}>+ New Sheet from Latest Quotes</button>
      </div>
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 16 }}>Market Calls → Price Worksheet → Customer Price Sheet → Customer Order. Add as many fee line items as you need per commodity — cooling, inspection, commission, whatever applies. Freight is tracked separately from product markup.</div>

      {activeSheet ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2.8fr 1fr', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#2F5233' }}>Sheet — valid through {activeSheet.valid_through}</strong>
              <div>
                <button onClick={() => setPrintMode(true)} style={{ ...btn, marginBottom: 0, background: '#fff', color: '#333', border: '1px solid #DCD5C1' }}>Customer Price Sheet / Print</button>
                <button onClick={() => deleteSheet(activeSheet.price_sheet_id)} style={{ ...btn, marginBottom: 0, marginLeft: 8, background: '#fff', color: '#C0562D', border: '1px solid #DCD5C1' }}>Delete Sheet</button>
              </div>
            </div>

            {lines.map(l => {
              const options = allQuotes.filter(q => q.product_id === l.product_id);
              const fees = feesByLine[l.price_sheet_line_id] || [];
              return (
                <div key={l.price_sheet_line_id} style={{ ...card, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ color: '#2F5233' }}>{l.products?.commodity} — {l.products?.pack_size}</strong>
                      <div style={{ fontSize: 12, color: '#78716c' }}>
                        RAW MARKET PRICE — {l.suppliers?.company || 'no supplier set'} · ${Number(l.cost_price || 0).toFixed(2)}/cs
                        {options.length > 1 && (
                          <select value={l.source_call_id || ''} onChange={e => switchQuote(l, e.target.value)} style={{ fontSize: 11, marginLeft: 8 }}>
                            {options.map(q => <option key={q.call_id} value={q.call_id}>{q.call_date} — {q.suppliers?.company} — ${Number(q.price).toFixed(2)}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                    <div>
                      <button onClick={() => openConvert(l)} style={{ ...btn, marginBottom: 0, background: '#6B8E4E' }}>Create / Add to Order</button>
                      <button onClick={() => deleteLine(l.price_sheet_line_id)} style={{ ...editBtn, marginLeft: 8 }}>Remove</button>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: '#78716c' }}>VARIABLE COSTS</div>
                  {fees.length === 0 && <div style={{ fontSize: 12, color: '#a8a29e' }}>No fees added.</div>}
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
                  <button onClick={() => addFee(l.price_sheet_line_id)} style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 12, cursor: 'pointer', marginTop: 6, padding: 0 }}>+ Add Fee</button>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #DCD5C1' }}>
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
                      <div style={{ fontWeight: 700, color: '#2F5233' }}>${customerFOB(l).toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={miniLabel}>Raw Cost / cs</div>
                      <input type="number" defaultValue={l.cost_price} onBlur={e => updateLine(l.price_sheet_line_id, 'cost_price', Number(e.target.value))} style={{ width: 70 }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid #DCD5C1' }}>
                    <div>
                      <div style={miniLabel}>FREIGHT — Est. Carrier Cost / cs</div>
                      <input type="number" defaultValue={l.est_carrier_cost_per_case} onBlur={e => updateLine(l.price_sheet_line_id, 'est_carrier_cost_per_case', Number(e.target.value))} style={{ width: 80 }} />
                    </div>
                    <div>
                      <div style={miniLabel}>Customer Freight Charge / cs</div>
                      <input type="number" defaultValue={l.customer_freight_per_case} onBlur={e => updateLine(l.price_sheet_line_id, 'customer_freight_per_case', Number(e.target.value))} style={{ width: 80 }} />
                    </div>
                    <div>
                      <div style={miniLabel}>Customer Delivered</div>
                      <div style={{ fontWeight: 700, color: '#2F5233' }}>${customerDelivered(l).toFixed(2)}</div>
                    </div>
                  </div>

                  {convertingLineId === l.price_sheet_line_id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #DCD5C1', background: '#F6F4EC', padding: 12, borderRadius: 6 }}>
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
                            <label style={{ fontSize: 13 }}>Acumatica Order #<input value={convertForm.newAcumaticaNo} onChange={e => setConvertForm({ ...convertForm, newAcumaticaNo: e.target.value })} style={selectStyle} /></label>
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
                      <button onClick={() => saveConvert(l)} style={{ ...btn, background: '#6B8E4E', marginTop: 10 }}>Save Order Line</button>
                      <button onClick={() => setConvertingLineId(null)} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 10, marginLeft: 8 }}>Cancel</button>
                    </div>
                  )}
                </div>
              );
            })}

            <button onClick={openAddLine} style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 4, padding: '4px 0' }}>+ Add Line</button>
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
                  <button onClick={saveNewLine} style={{ ...btn, marginBottom: 0, background: '#6B8E4E' }}>Save Line</button>
                  <button onClick={() => setShowAddLine(false)} style={{ ...btn, marginBottom: 0, background: '#fff', color: '#333', border: '1px solid #DCD5C1' }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <strong style={{ color: '#2F5233' }}>Sent To</strong>
            <div style={{ marginTop: 8 }}>
              {customers.map(c => {
                const sent = recipients.find(r => r.customer_id === c.customer_id);
                return (
                  <div key={c.customer_id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #DCD5C1' }}>
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
        <p style={{ color: '#a8a29e' }}>No price sheets yet. Log some Market Calls with supplier quotes, then click "+ New Sheet from Latest Quotes."</p>
      )}
    </AppShell>
  );
}

const btn = { padding: '8px 16px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' };
const editBtn = { padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
const selectStyle = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
const miniLabel = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '.03em', color: '#78716c', fontWeight: 600, marginBottom: 2 };
