// pages/app/pricesheets.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function PriceSheetsPage() {
  const [sheets, setSheets] = useState([]);
  const [activeSheetId, setActiveSheetId] = useState(null);
  const [lines, setLines] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [allQuotes, setAllQuotes] = useState([]);
  const [printMode, setPrintMode] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLineForm, setNewLineForm] = useState({ product_id: '', supplier_id: '', cost_price: '', margin_pct: 20, markup_type: 'percent', markup_dollar: 0 });

  useEffect(() => { loadSheets(); loadCustomers(); loadQuotes(); loadProducts(); loadSuppliers(); }, []);
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
    const { data } = await supabase.from('products').select('product_id, commodity, pack_size').order('commodity');
    setProducts(data || []);
  }
  async function loadSuppliers() {
    const { data } = await supabase.from('suppliers').select('supplier_id, company, per_case_fee').order('company');
    setSuppliers(data || []);
  }
  async function loadQuotes() {
    // every supplier quote, not merged — used to build "all options" per commodity
    const { data } = await supabase
      .from('call_log')
      .select('*, suppliers(company, per_case_fee), products(commodity, pack_size)')
      .not('price', 'is', null)
      .eq('party_type', 'Supplier')
      .order('call_date', { ascending: false });
    setAllQuotes(data || []);
  }
  async function loadDetail(sheetId) {
    const { data: l } = await supabase.from('price_sheet_lines').select('*, products(commodity, pack_size), suppliers(company, per_case_fee)').eq('price_sheet_id', sheetId);
    setLines(l || []);
    const { data: r } = await supabase.from('price_sheet_recipients').select('*').eq('price_sheet_id', sheetId);
    setRecipients(r || []);
  }

  async function createFromLatestQuotes() {
    // auto-pull a starting price per commodity (lowest current quote) — every
    // other quote for that commodity stays available to switch to manually
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

  function openAddLine() { setNewLineForm({ product_id: '', supplier_id: '', cost_price: '', margin_pct: 20, markup_type: 'percent', markup_dollar: 0 }); setShowAddLine(true); }
  function pickProductForNewLine(productId) {
    // autofill cost from the latest quote for this product, if one exists
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
    const { error } = await supabase.from('price_sheet_lines').delete().eq('price_sheet_line_id', lineId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadDetail(activeSheetId);
  }
  async function deleteSheet(sheetId) {
    if (!confirm('Delete this entire price sheet? This removes all its lines and recipient records too — cannot be undone.')) return;
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

  function effectiveCost(l) { return Number(l.cost_price || 0) + Number(l.suppliers?.per_case_fee || 0); }
  function sellPrice(l) {
    const cost = effectiveCost(l);
    return l.markup_type === 'dollar' ? cost + Number(l.markup_dollar || 0) : cost * (1 + Number(l.margin_pct || 0) / 100);
  }

  const activeSheet = sheets.find(s => s.price_sheet_id === activeSheetId);

  if (printMode && activeSheet) {
    return (
      <AppShell title="Price Sheet — Customer View">
        <div className="no-print" style={{ marginBottom: 16 }}>
          <button onClick={() => setPrintMode(false)} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginRight: 8 }}>← Back to editing</button>
          <button onClick={() => window.print()} style={btn}>🖨 Print</button>
        </div>
        <div style={card}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#2F5233' }}>FreshOps Produce Pricing</div>
          <div style={{ color: '#78716c', fontSize: 13, marginBottom: 12 }}>Valid through {activeSheet.valid_through}</div>
          <table style={table}>
            <thead><tr style={trHead}><th>Commodity</th><th>Pack / Size</th><th style={{ textAlign: 'right' }}>Price / Case</th></tr></thead>
            <tbody>{lines.map(l => (
              <tr key={l.price_sheet_line_id} style={tr}>
                <td>{l.products?.commodity}</td><td>{l.products?.pack_size}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2F5233' }}>${sellPrice(l).toFixed(2)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Price Sheets">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {sheets.map(s => (
          <button key={s.price_sheet_id} onClick={() => setActiveSheetId(s.price_sheet_id)}
            style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, cursor: 'pointer', border: '1px solid #DCD5C1', background: activeSheetId === s.price_sheet_id ? '#2F5233' : '#fff', color: activeSheetId === s.price_sheet_id ? '#fff' : '#333' }}>
            {s.sheet_date}
          </button>
        ))}
        <button onClick={createFromLatestQuotes} style={btn}>+ New Sheet from Latest Quotes</button>
      </div>
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 16 }}>Cost includes any per-case supplier fee automatically. Use "Change Quote" on any line to switch to a different supplier's price for that commodity — every quote you've logged stays available, none are merged away.</div>

      {activeSheet ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2.6fr 1fr', gap: 16 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#2F5233' }}>Sheet — valid through {activeSheet.valid_through}</strong>
              <div>
                <button onClick={() => setPrintMode(true)} style={{ ...btn, marginBottom: 0, background: '#fff', color: '#333', border: '1px solid #DCD5C1' }}>Customer View / Print</button>
                <button onClick={() => deleteSheet(activeSheet.price_sheet_id)} style={{ ...btn, marginBottom: 0, marginLeft: 8, background: '#fff', color: '#C0562D', border: '1px solid #DCD5C1' }}>Delete Sheet</button>
              </div>
            </div>
            <table style={table}>
              <thead><tr style={trHead}><th>Commodity</th><th>Supplier (quote used)</th><th style={{ textAlign: 'right' }}>Quoted Cost</th><th style={{ textAlign: 'right' }}>Fee</th><th style={{ textAlign: 'right' }}>Eff. Cost</th><th>Markup</th><th style={{ textAlign: 'right' }}>Sell $/cs</th><th></th></tr></thead>
              <tbody>{lines.map(l => {
                const options = allQuotes.filter(q => q.product_id === l.product_id);
                return (
                  <tr key={l.price_sheet_line_id} style={tr}>
                    <td>{l.products?.commodity} — {l.products?.pack_size}</td>
                    <td style={{ fontSize: 12 }}>
                      <div>{l.suppliers?.company || '—'}</div>
                      {options.length > 1 && (
                        <select value={l.source_call_id || ''} onChange={e => switchQuote(l, e.target.value)} style={{ fontSize: 11, marginTop: 2 }}>
                          {options.map(q => <option key={q.call_id} value={q.call_id}>{q.call_date} — {q.suppliers?.company} — ${Number(q.price).toFixed(2)}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}><input type="number" defaultValue={l.cost_price} onBlur={e => updateLine(l.price_sheet_line_id, 'cost_price', Number(e.target.value))} style={{ width: 68, textAlign: 'right' }} /></td>
                    <td style={{ textAlign: 'right', color: '#78716c' }}>{l.suppliers?.per_case_fee ? `$${Number(l.suppliers.per_case_fee).toFixed(2)}` : '—'}</td>
                    <td style={{ textAlign: 'right', color: '#78716c' }}>${effectiveCost(l).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select value={l.markup_type} onChange={e => updateLine(l.price_sheet_line_id, 'markup_type', e.target.value)} style={{ fontSize: 12 }}>
                          <option value="percent">%</option>
                          <option value="dollar">$</option>
                        </select>
                        {l.markup_type === 'dollar' ? (
                          <input type="number" defaultValue={l.markup_dollar} onBlur={e => updateLine(l.price_sheet_line_id, 'markup_dollar', Number(e.target.value))} style={{ width: 60 }} />
                        ) : (
                          <input type="number" defaultValue={l.margin_pct} onBlur={e => updateLine(l.price_sheet_line_id, 'margin_pct', Number(e.target.value))} style={{ width: 60 }} />
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#2F5233' }}>${sellPrice(l).toFixed(2)}</td>
                    <td><button onClick={() => deleteLine(l.price_sheet_line_id)} style={{ ...editBtn, color: '#C0562D' }}>Remove</button></td>
                  </tr>
                );
              })}</tbody>
            </table>

            <button onClick={openAddLine} style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 10, padding: '4px 0' }}>+ Add Line</button>
            {showAddLine && (
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid #DCD5C1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
                <label style={{ fontSize: 13 }}>Cost Price ($/cs) — autofilled if a quote exists
                  <input type="number" value={newLineForm.cost_price} onChange={e => setNewLineForm({ ...newLineForm, cost_price: e.target.value })} style={selectStyle} />
                </label>
                <label style={{ fontSize: 13 }}>Markup Type
                  <select value={newLineForm.markup_type} onChange={e => setNewLineForm({ ...newLineForm, markup_type: e.target.value })} style={selectStyle}>
                    <option value="percent">%</option><option value="dollar">$</option>
                  </select>
                </label>
                {newLineForm.markup_type === 'dollar' ? (
                  <label style={{ fontSize: 13 }}>Markup ($/cs)<input type="number" value={newLineForm.markup_dollar} onChange={e => setNewLineForm({ ...newLineForm, markup_dollar: e.target.value })} style={selectStyle} /></label>
                ) : (
                  <label style={{ fontSize: 13 }}>Margin (%)<input type="number" value={newLineForm.margin_pct} onChange={e => setNewLineForm({ ...newLineForm, margin_pct: e.target.value })} style={selectStyle} /></label>
                )}
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
const selectStyle = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
