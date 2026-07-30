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
  const [suppliers, setSuppliers] = useState([]);
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => { loadSheets(); loadCustomers(); loadSuppliers(); }, []);
  useEffect(() => { if (activeSheetId) loadDetail(activeSheetId); }, [activeSheetId]);

  async function loadSheets() {
    const { data } = await supabase.from('price_sheets').select('*').order('sheet_date', { ascending: false });
    setSheets(data || []);
    if (data && data.length && !activeSheetId) setActiveSheetId(data[0].price_sheet_id);
  }
  async function loadCustomers() {
    const { data } = await supabase.from('customers').select('customer_id, company').order('company');
    setCustomers(data || []);
  }
  async function loadSuppliers() {
    const { data } = await supabase.from('suppliers').select('supplier_id, company, per_case_fee').order('company');
    setSuppliers(data || []);
  }
  async function loadDetail(sheetId) {
    const { data: l } = await supabase.from('price_sheet_lines').select('*, products(commodity, pack_size), suppliers(company, per_case_fee)').eq('price_sheet_id', sheetId);
    setLines(l || []);
    const { data: r } = await supabase.from('price_sheet_recipients').select('*').eq('price_sheet_id', sheetId);
    setRecipients(r || []);
  }

  async function createFromLatestQuotes() {
    const { data: quotes } = await supabase
      .from('call_log')
      .select('*')
      .not('price', 'is', null)
      .eq('party_type', 'Supplier')
      .order('call_date', { ascending: false });

    const latestByProduct = {};
    (quotes || []).forEach(q => { if (!latestByProduct[q.product_id]) latestByProduct[q.product_id] = q; });
    const productIds = Object.keys(latestByProduct);
    if (productIds.length === 0) { alert('No supplier price quotes logged yet — add some in Market Calls first.'); return; }

    const validThrough = new Date(); validThrough.setDate(validThrough.getDate() + 4);
    const { data: sheet, error: sheetErr } = await supabase.from('price_sheets').insert({
      sheet_date: new Date().toISOString().slice(0, 10),
      valid_through: validThrough.toISOString().slice(0, 10),
      notes: 'Auto-built from latest supplier quotes'
    }).select().single();
    if (sheetErr) { alert('Could not create sheet: ' + sheetErr.message); return; }

    const newLines = productIds.map(pid => ({
      price_sheet_id: sheet.price_sheet_id,
      product_id: Number(pid),
      supplier_id: latestByProduct[pid].supplier_id,
      cost_price: latestByProduct[pid].price,
      margin_pct: 20,
      markup_type: 'percent',
      markup_dollar: 0,
      source_call_id: latestByProduct[pid].call_id,
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

  async function toggleRecipient(customerId) {
    const existing = recipients.find(r => r.customer_id === customerId);
    if (existing) {
      await supabase.from('price_sheet_recipients').delete().eq('price_sheet_recipient_id', existing.price_sheet_recipient_id);
    } else {
      const { error } = await supabase.from('price_sheet_recipients').insert({ price_sheet_id: activeSheetId, customer_id: customerId });
      if (error) { alert('Failed: ' + error.message); return; }
    }
    loadDetail(activeSheetId);
  }

  // supplier's per-case fee (e.g. Happy's Logicold cooler fee) folds into
  // cost before your markup is applied, so it's covered automatically
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
        <style jsx>{`@media print { .no-print { display: none; } }`}</style>
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
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 16 }}>Cost includes any per-case supplier fee automatically (e.g. a cooler fee). Choose a % markup or a flat $/case markup per line. Use "Customer View / Print" for a clean sheet with no cost or margin.</div>

      {activeSheet ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2.4fr 1fr', gap: 16 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ color: '#2F5233' }}>Sheet — valid through {activeSheet.valid_through}</strong>
              <button onClick={() => setPrintMode(true)} style={{ ...btn, marginBottom: 0, background: '#fff', color: '#333', border: '1px solid #DCD5C1' }}>Customer View / Print</button>
            </div>
            <table style={table}>
              <thead><tr style={trHead}><th>Commodity</th><th>Supplier</th><th style={{ textAlign: 'right' }}>Quoted Cost</th><th style={{ textAlign: 'right' }}>Fee</th><th style={{ textAlign: 'right' }}>Eff. Cost</th><th>Markup</th><th style={{ textAlign: 'right' }}>Sell $/cs</th></tr></thead>
              <tbody>{lines.map(l => (
                <tr key={l.price_sheet_line_id} style={tr}>
                  <td>{l.products?.commodity} — {l.products?.pack_size}</td>
                  <td style={{ fontSize: 12 }}>{l.suppliers?.company || '—'}</td>
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
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={card}>
            <strong style={{ color: '#2F5233' }}>Sent To</strong>
            <div style={{ marginTop: 8 }}>
              {customers.map(c => {
                const sent = recipients.find(r => r.customer_id === c.customer_id);
                return (
                  <label key={c.customer_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                    <input type="checkbox" checked={!!sent} onChange={() => toggleRecipient(c.customer_id)} />
                    {c.company}
                  </label>
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
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
