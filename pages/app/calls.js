// pages/app/calls.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK_QUICK = { supplier_id: '', product_id: '', price: '', notes: '' };
const BLANK_HEADER = { supplier_id: '', contact_name: '', phone: '', call_date: '' };
const BLANK_QUOTE = { product_id: '', price: '', availability: '', notes: '' };

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [showQuick, setShowQuick] = useState(false);
  const [quickForm, setQuickForm] = useState(BLANK_QUICK);

  const [showFull, setShowFull] = useState(false);
  const [header, setHeader] = useState(BLANK_HEADER);
  const [quotes, setQuotes] = useState([{ ...BLANK_QUOTE }]);

  const [expandedKey, setExpandedKey] = useState(null);
  const [search, setSearch] = useState('');
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const [historyFor, setHistoryFor] = useState(null); // { supplier_id, product_id, label }
  const [selectedCallLines, setSelectedCallLines] = useState(new Set());

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [cl, s, p] = await Promise.all([
      supabase.from('call_log').select('*, suppliers(company), products(commodity, pack_size)').eq('party_type', 'Supplier').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('supplier_id, company').order('company'),
      supabase.from('products').select('product_id, commodity, pack_size').order('commodity'),
    ]);
    setCalls(cl.data || []);
    setSuppliers(s.data || []);
    setProducts(p.data || []);
  }

  // ---- Quick Price — one line, as fast as possible ----
  function openQuick() { setQuickForm(BLANK_QUICK); setShowQuick(true); setShowFull(false); }
  async function saveQuick() {
    if (!quickForm.supplier_id || !quickForm.product_id || !quickForm.price) { alert('Supplier, Commodity, and FOB Price are required.'); return; }
    const { error } = await supabase.from('call_log').insert({
      call_date: new Date().toISOString().slice(0, 10), party_type: 'Supplier',
      supplier_id: Number(quickForm.supplier_id), product_id: Number(quickForm.product_id),
      price: Number(quickForm.price), price_type: 'FOB', notes: quickForm.notes || null,
    });
    if (error) { alert('Save failed: ' + error.message); return; }
    setQuickForm(BLANK_QUICK); setShowQuick(false);
    loadAll();
  }

  // ---- Full call — several prices in one shot ----
  function openFull() { setHeader({ ...BLANK_HEADER, call_date: new Date().toISOString().slice(0, 10) }); setQuotes([{ ...BLANK_QUOTE }]); setShowFull(true); setShowQuick(false); }
  function addQuoteRow() { setQuotes([...quotes, { ...BLANK_QUOTE }]); }
  function removeQuoteRow(i) { setQuotes(quotes.filter((_, idx) => idx !== i)); }
  function updateQuoteRow(i, field, value) {
    const next = [...quotes];
    next[i] = { ...next[i], [field]: value };
    setQuotes(next);
  }
  async function saveFull() {
    if (!header.supplier_id) { alert('Pick a Supplier.'); return; }
    const validQuotes = quotes.filter(q => q.product_id && q.price);
    if (validQuotes.length === 0) { alert('Add at least one commodity with a price.'); return; }
    const rows = validQuotes.map(q => ({
      call_date: header.call_date || new Date().toISOString().slice(0, 10), party_type: 'Supplier',
      supplier_id: Number(header.supplier_id), contact_name: header.contact_name || null, phone: header.phone || null,
      product_id: Number(q.product_id), price: Number(q.price), price_type: 'FOB',
      availability: q.availability || null, notes: q.notes || null,
    }));
    const { error } = await supabase.from('call_log').insert(rows);
    if (error) { alert('Save failed: ' + error.message); return; }
    setShowFull(false); setHeader(BLANK_HEADER); setQuotes([{ ...BLANK_QUOTE }]);
    loadAll();
  }

  async function deleteCall(id) {
    if (!confirm('Delete this price entry? This cannot be undone.')) return;
    const { error } = await supabase.from('call_log').delete().eq('call_id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }

  function toggleCallLine(callId) {
    const next = new Set(selectedCallLines);
    if (next.has(callId)) next.delete(callId); else next.add(callId);
    setSelectedCallLines(next);
  }
  async function addSelectedToPriceSheet() {
    if (selectedCallLines.size === 0) { alert('Select at least one price to add.'); return; }
    const today = new Date().toISOString().slice(0, 10);
    let { data: sheet } = await supabase.from('price_sheets').select('*').eq('sheet_date', today).maybeSingle();
    if (!sheet) {
      const validThrough = new Date(); validThrough.setDate(validThrough.getDate() + 4);
      const { data: created, error: sheetErr } = await supabase.from('price_sheets').insert({
        sheet_date: today, valid_through: validThrough.toISOString().slice(0, 10),
      }).select().single();
      if (sheetErr) { alert('Could not create sheet: ' + sheetErr.message); return; }
      sheet = created;
    }
    const selectedRows = calls.filter(c => selectedCallLines.has(c.call_id));
    const newLines = selectedRows.map(c => ({
      price_sheet_id: sheet.price_sheet_id, product_id: c.product_id, supplier_id: c.supplier_id, cost_price: c.price,
      margin_pct: 20, markup_type: 'percent', markup_dollar: 0, est_carrier_cost_per_pallet: 0, customer_freight_per_case: 0,
      source_call_id: c.call_id,
    }));
    const { error } = await supabase.from('price_sheet_lines').insert(newLines);
    if (error) { alert('Could not add to Price Sheet: ' + error.message); return; }
    setSelectedCallLines(new Set());
    alert(`Added ${newLines.length} price${newLines.length !== 1 ? 's' : ''} to today's Price Sheet (${today}) — head to Price Sheets to finish building it.`);
  }

  // ---- group individual price rows back into "calls" ----
  const groups = {};
  calls.forEach(c => {
    const key = `${c.call_date}|${c.supplier_id}|${c.contact_name || ''}`;
    if (!groups[key]) groups[key] = { key, call_date: c.call_date, created_at: c.created_at, supplier: c.suppliers?.company, contact_name: c.contact_name, phone: c.phone, quotes: [] };
    groups[key].quotes.push(c);
    if (new Date(c.created_at) < new Date(groups[key].created_at)) groups[key].created_at = c.created_at;
  });
  let groupList = Object.values(groups).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (filterSupplierId) groupList = groupList.filter(g => g.quotes[0]?.supplier_id === Number(filterSupplierId));
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    groupList = groupList.filter(g =>
      g.supplier?.toLowerCase().includes(q) ||
      g.quotes.some(x => x.products?.commodity?.toLowerCase().includes(q) || x.products?.pack_size?.toLowerCase().includes(q))
    );
  }

  // ---- current price per supplier+product, with trend vs previous ----
  const currentPrices = {};
  calls.forEach(c => {
    const key = `${c.supplier_id}-${c.product_id}`;
    if (!currentPrices[key]) currentPrices[key] = [];
    currentPrices[key].push(c);
  });
  Object.values(currentPrices).forEach(arr => arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));

  function openHistory(supplierId, productId, label) {
    setHistoryFor({ supplier_id: supplierId, product_id: productId, label });
  }
  const historyRows = historyFor ? (currentPrices[`${historyFor.supplier_id}-${historyFor.product_id}`] || []) : [];

  return (
    <AppShell title="Market Calls">
      <div style={{ color: 'var(--fo-text-dim)', fontSize: 13, marginBottom: 16 }}>Capture supplier FOB prices fast — one call can cover several commodities. Price Sheets pull straight from what's logged here.</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={openQuick} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff' }}>⚡ Quick Price</button>
        <button onClick={openFull} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-primary)', color: '#fff' }}>+ Log Full Call</button>
        <input placeholder="Search supplier or commodity..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginLeft: 'auto', minWidth: 220 }} />
        <select value={filterSupplierId} onChange={e => setFilterSupplierId(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
        </select>
      </div>

      {showQuick && (
        <div className="fo-card" style={{ marginBottom: 16 }}>
          <div className="fo-h2">Quick Price</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <label style={{ fontSize: 13 }}><span className="fo-field-label">Supplier</span>
              <select value={quickForm.supplier_id} onChange={e => setQuickForm({ ...quickForm, supplier_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                <option value="">— select —</option>
                {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13 }}><span className="fo-field-label">Commodity</span>
              <select value={quickForm.product_id} onChange={e => setQuickForm({ ...quickForm, product_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                <option value="">— select —</option>
                {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
              </select>
            </label>
            {field('FOB $/Case', quickForm.price, v => setQuickForm({ ...quickForm, price: v }), 'number')}
            {field('Note (optional)', quickForm.notes, v => setQuickForm({ ...quickForm, notes: v }))}
          </div>
          <button onClick={saveQuick} className="fo-btn fo-btn-primary" style={{ marginTop: 12, marginRight: 8 }}>Save</button>
          <button onClick={() => setShowQuick(false)} className="fo-btn fo-btn-secondary" style={{ marginTop: 12 }}>Cancel</button>
        </div>
      )}

      {showFull && (
        <div className="fo-card" style={{ marginBottom: 16 }}>
          <div className="fo-h2">Log Full Call</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <label style={{ fontSize: 13 }}><span className="fo-field-label">Supplier</span>
              <select value={header.supplier_id} onChange={e => setHeader({ ...header, supplier_id: e.target.value })} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                <option value="">— select —</option>
                {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
              </select>
            </label>
            {field('Contact', header.contact_name, v => setHeader({ ...header, contact_name: v }))}
            {field('Phone', header.phone, v => setHeader({ ...header, phone: v }))}
            {field('Call Date', header.call_date, v => setHeader({ ...header, call_date: v }), 'date')}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--fo-border-soft)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fo-primary)', marginBottom: 8 }}>Prices Quoted</div>
            {quotes.map((q, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 8, alignItems: 'end' }}>
                <label style={{ fontSize: 13 }}><span className="fo-field-label">Commodity</span>
                  <select value={q.product_id} onChange={e => updateQuoteRow(i, 'product_id', e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }}>
                    <option value="">— select —</option>
                    {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
                  </select>
                </label>
                {field('FOB $/Case', q.price, v => updateQuoteRow(i, 'price', v), 'number')}
                {field('Availability (optional)', q.availability, v => updateQuoteRow(i, 'availability', v))}
                {field('Note (optional)', q.notes, v => updateQuoteRow(i, 'notes', v))}
                {quotes.length > 1 && <button onClick={() => removeQuoteRow(i)} className="fo-btn fo-btn-danger fo-btn-sm">Remove</button>}
              </div>
            ))}
            <button onClick={addQuoteRow} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>+ Add Another Price</button>
          </div>

          <button onClick={saveFull} className="fo-btn fo-btn-primary" style={{ marginTop: 12, marginRight: 8 }}>Save Call</button>
          <button onClick={() => setShowFull(false)} className="fo-btn fo-btn-secondary" style={{ marginTop: 12 }}>Cancel</button>
        </div>
      )}

      {/* ---- Compact saved calls ---- */}
      {groupList.map(g => {
        const isOpen = expandedKey === g.key;
        const time = new Date(g.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const dateLabel = new Date(g.call_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return (
          <div key={g.key} className="fo-card" style={{ marginBottom: 10, padding: 14 }}>
            <button onClick={() => setExpandedKey(isOpen ? null : g.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: 14.5 }}>{isOpen ? '⌄' : '›'} {g.supplier}</strong>
                  <div style={{ fontSize: 12, color: 'var(--fo-text-dim)', marginTop: 2 }}>{dateLabel} • {time} — {g.quotes.length} price{g.quotes.length !== 1 ? 's' : ''} captured{g.contact_name ? ` · Contact: ${g.contact_name}` : ''}</div>
                </div>
                <span className="fo-badge fo-badge-gray">{isOpen ? 'Hide' : 'View Call'}</span>
              </div>
            </button>
            {isOpen && (
              <div className="fo-table-wrap" style={{ marginTop: 12 }}>
                <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th></th><th>Commodity</th><th style={{ textAlign: 'right' }}>FOB $/cs</th><th>Availability</th><th>Note</th><th></th></tr></thead>
                  <tbody>{g.quotes.map(q => (
                    <tr key={q.call_id}>
                      <td><input type="checkbox" checked={selectedCallLines.has(q.call_id)} onChange={() => toggleCallLine(q.call_id)} /></td>
                      <td>{q.products?.commodity} — {q.products?.pack_size}</td>
                      <td style={{ textAlign: 'right' }}>${Number(q.price).toFixed(2)}</td>
                      <td style={{ color: 'var(--fo-text-dim)' }}>{q.availability || '—'}</td>
                      <td style={{ color: 'var(--fo-text-dim)' }}>{q.notes || '—'}</td>
                      <td>
                        <button onClick={() => openHistory(q.supplier_id, q.product_id, `${q.products?.commodity} — ${q.products?.pack_size}`)} className="fo-btn fo-btn-secondary fo-btn-sm">History</button>{' '}
                        <button onClick={() => deleteCall(q.call_id)} className="fo-btn fo-btn-danger fo-btn-sm">Delete</button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
                <button onClick={addSelectedToPriceSheet} className="fo-btn fo-btn-sm" style={{ background: 'var(--fo-accent)', color: '#fff', marginTop: 10 }}>+ Add Selected to Price Sheet</button>
              </div>
            )}
          </div>
        );
      })}
      {groupList.length === 0 && <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No calls logged yet.</div>}

      {historyFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setHistoryFor(null)}>
          <div className="fo-card" style={{ maxWidth: 480, width: '90%', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="fo-h2">Price History — {historyFor.label}</div>
            {historyRows.length === 0 ? <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>No history.</div> : (
              <div className="fo-table-wrap">
                <table className="fo-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr><th>Date</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'right' }}>Change</th></tr></thead>
                  <tbody>{historyRows.map((r, i) => {
                    const prev = historyRows[i + 1];
                    const diff = prev ? Number(r.price) - Number(prev.price) : null;
                    const pct = prev && Number(prev.price) ? (diff / Number(prev.price)) * 100 : null;
                    return (
                      <tr key={r.call_id}>
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>${Number(r.price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: diff == null ? 'var(--fo-text-faint)' : diff > 0 ? 'var(--fo-error)' : diff < 0 ? 'var(--fo-success)' : 'var(--fo-text-dim)' }}>
                          {diff == null ? '—' : `${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${pct.toFixed(1)}%)`}
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            )}
            <button onClick={() => setHistoryFor(null)} className="fo-btn fo-btn-secondary" style={{ marginTop: 12 }}>Close</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function field(label, value, onChange, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>
      <span className="fo-field-label">{label}</span>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4 }} />
    </label>
  );
}
