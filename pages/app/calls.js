// pages/app/calls.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK_HEADER = { call_date: '', party_type: 'Supplier', party_id: '', contact_name: '', phone: '', followup_date: '', status: 'Quoted', notes: '' };
const BLANK_QUOTE = { product_id: '', price: '', price_type: 'FOB', availability: '', quote_expiration: '' };

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [header, setHeader] = useState(BLANK_HEADER);
  const [quotes, setQuotes] = useState([{ ...BLANK_QUOTE }]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [cl, s, c, p] = await Promise.all([
      supabase.from('call_log').select('*, suppliers(company), customers(company), products(commodity, pack_size)').order('call_date', { ascending: false }),
      supabase.from('suppliers').select('supplier_id, company').order('company'),
      supabase.from('customers').select('customer_id, company').order('company'),
      supabase.from('products').select('product_id, commodity, pack_size').order('commodity'),
    ]);
    setCalls(cl.data || []);
    setSuppliers(s.data || []);
    setCustomers(c.data || []);
    setProducts(p.data || []);
  }

  function partyLabel(c) {
    if (c.party_type === 'Supplier') return c.suppliers?.company;
    return c.customers?.company;
  }

  function openAdd() { setHeader(BLANK_HEADER); setQuotes([{ ...BLANK_QUOTE }]); setEditingId(null); setShowForm(true); }
  function openEdit(c) {
    setHeader({
      call_date: c.call_date || '', party_type: c.party_type, party_id: c.party_type === 'Supplier' ? c.supplier_id : c.customer_id,
      contact_name: c.contact_name || '', phone: c.phone || '', followup_date: c.followup_date || '', status: c.status, notes: c.notes || '',
    });
    setQuotes([{ product_id: c.product_id, price: c.price ?? '', price_type: c.price_type || 'FOB', availability: c.availability || '', quote_expiration: c.quote_expiration || '' }]);
    setEditingId(c.call_id);
    setShowForm(true);
  }

  function addQuoteRow() { setQuotes([...quotes, { ...BLANK_QUOTE }]); }
  function removeQuoteRow(i) { setQuotes(quotes.filter((_, idx) => idx !== i)); }
  function updateQuoteRow(i, field, value) {
    const next = [...quotes];
    next[i] = { ...next[i], [field]: value };
    setQuotes(next);
  }

  async function saveCalls() {
    if (!header.party_id) { alert('Pick a Supplier or Customer.'); return; }
    const validQuotes = quotes.filter(q => q.product_id);
    if (validQuotes.length === 0) { alert('Add at least one commodity.'); return; }

    const baseFields = {
      call_date: header.call_date || new Date().toISOString().slice(0, 10),
      party_type: header.party_type,
      supplier_id: header.party_type === 'Supplier' ? Number(header.party_id) : null,
      customer_id: header.party_type === 'Customer' ? Number(header.party_id) : null,
      contact_name: header.contact_name || null,
      phone: header.phone || null,
      followup_date: header.followup_date || null,
      status: header.status,
      notes: header.notes || null,
    };

    if (editingId) {
      const q = validQuotes[0];
      const { error } = await supabase.from('call_log').update({
        ...baseFields, product_id: Number(q.product_id), price: q.price ? Number(q.price) : null, price_type: q.price_type, availability: q.availability || null, quote_expiration: q.quote_expiration || null,
      }).eq('call_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const rows = validQuotes.map(q => ({
        ...baseFields, product_id: Number(q.product_id), price: q.price ? Number(q.price) : null, price_type: q.price_type, availability: q.availability || null, quote_expiration: q.quote_expiration || null,
      }));
      const { error } = await supabase.from('call_log').insert(rows);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setHeader(BLANK_HEADER); setQuotes([{ ...BLANK_QUOTE }]);
    loadAll();
  }
  async function deleteCall(id) {
    if (!confirm('Delete this quote/call? This cannot be undone.')) return;
    const { error } = await supabase.from('call_log').delete().eq('call_id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }

  const partyList = header.party_type === 'Supplier' ? suppliers : customers;
  const partyIdKey = header.party_type === 'Supplier' ? 'supplier_id' : 'customer_id';

  return (
    <AppShell title="Market Calls">
      <div style={{ color: 'var(--fo-text-dim)', fontSize: 13, marginBottom: 16 }}>Every call to a supplier or customer — and any price quoted — lives here. Price Sheets pull straight from these entries. One call can cover several commodities at once.</div>
      <button onClick={openAdd} style={btn}>+ Log Call</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            <label style={{ fontSize: 13 }}>Date<input type="date" value={header.call_date} onChange={e => setHeader({ ...header, call_date: e.target.value })} style={input} /></label>
            <label style={{ fontSize: 13 }}>Party Type
              <select value={header.party_type} onChange={e => setHeader({ ...header, party_type: e.target.value, party_id: '' })} style={input}>
                <option>Supplier</option><option>Customer</option>
              </select>
            </label>
            <label style={{ fontSize: 13 }}>{header.party_type}
              <select value={header.party_id} onChange={e => setHeader({ ...header, party_id: e.target.value })} style={input}>
                <option value="">— select —</option>
                {partyList.map(p => <option key={p[partyIdKey]} value={p[partyIdKey]}>{p.company}</option>)}
              </select>
            </label>
            {field('Contact Name', header.contact_name, v => setHeader({ ...header, contact_name: v }))}
            {field('Phone', header.phone, v => setHeader({ ...header, phone: v }))}
            <label style={{ fontSize: 13 }}>Follow-up Date<input type="date" value={header.followup_date} onChange={e => setHeader({ ...header, followup_date: e.target.value })} style={input} /></label>
            <label style={{ fontSize: 13 }}>Status
              <select value={header.status} onChange={e => setHeader({ ...header, status: e.target.value })} style={input}>
                <option>Quoted</option><option>Follow-up</option><option>Booked</option><option>Passed</option>
              </select>
            </label>
            {field('Notes', header.notes, v => setHeader({ ...header, notes: v }))}
          </div>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--fo-border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fo-primary)', marginBottom: 8 }}>Commodities Quoted This Call</div>
            {quotes.map((q, i) => (
              <div key={i} style={{ ...grid, marginBottom: 8, alignItems: 'end' }}>
                <label style={{ fontSize: 13 }}>Product
                  <select value={q.product_id} onChange={e => updateQuoteRow(i, 'product_id', e.target.value)} style={input}>
                    <option value="">— select —</option>
                    {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: 13 }}>Price ($/case)
                  <input type="number" value={q.price} onChange={e => updateQuoteRow(i, 'price', e.target.value)} style={input} />
                </label>
                <label style={{ fontSize: 13 }}>Price Type
                  <select value={q.price_type} onChange={e => updateQuoteRow(i, 'price_type', e.target.value)} style={input}>
                    <option>FOB</option><option>Delivered</option>
                  </select>
                </label>
                <label style={{ fontSize: 13 }}>Availability
                  <input value={q.availability} onChange={e => updateQuoteRow(i, 'availability', e.target.value)} style={input} />
                </label>
                <label style={{ fontSize: 13 }}>Quote Good Until (optional)
                  <input type="date" value={q.quote_expiration} onChange={e => updateQuoteRow(i, 'quote_expiration', e.target.value)} style={input} />
                </label>
                {!editingId && quotes.length > 1 && (
                  <button onClick={() => removeQuoteRow(i)} style={{ ...editBtn, color: 'var(--fo-error)', height: 33 }}>Remove</button>
                )}
              </div>
            ))}
            {!editingId && (
              <button onClick={addQuoteRow} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>+ Add Another Commodity</button>
            )}
          </div>

          <button onClick={saveCalls} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>{editingId ? 'Update Call' : 'Save Call(s)'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <div className="fo-table-wrap">
      <table style={table} className="fo-table">
        <thead><tr style={trHead}><th>Date</th><th>Party</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Price</th><th>Availability</th><th>Good Until</th><th>Follow-up</th><th>Status</th><th></th></tr></thead>
        <tbody>{calls.map(c => (
          <tr key={c.call_id} style={tr}>
            <td style={{ color: 'var(--fo-text-dim)', fontSize: 12 }}>{c.call_date}</td>
            <td>{partyLabel(c)}</td>
            <td>{c.products?.commodity} — {c.products?.pack_size}</td>
            <td style={{ textAlign: 'right' }}>{c.price != null ? `$${Number(c.price).toFixed(2)} ${c.price_type}` : '—'}</td>
            <td style={{ color: 'var(--fo-text-dim)', fontSize: 12 }}>{c.availability}</td>
            <td style={{ fontSize: 12, color: c.quote_expiration && new Date(c.quote_expiration) < new Date() ? 'var(--fo-error)' : 'var(--fo-text-dim)' }}>{c.quote_expiration || '—'}</td>
            <td style={{ color: 'var(--fo-text-dim)', fontSize: 12 }}>{c.followup_date || '—'}</td>
            <td>{c.status}</td>
            <td><button onClick={() => openEdit(c)} style={editBtn}>Edit</button> <button onClick={() => deleteCall(c.call_id)} style={{ ...editBtn, color: 'var(--fo-error)' }}>Delete</button></td>
          </tr>
        ))}</tbody>
      </table>
      </div>
    </AppShell>
  );
}

function field(label, value, onChange, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>
      <span className="fo-field-label">{label}</span>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}
const btn = { padding: '10px 18px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 'var(--fo-radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '6px 13px', fontSize: 12.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer', fontWeight: 500 };
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm), var(--fo-glow)', padding: 18, marginBottom: 16 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 };
const input = { display: 'block', width: '100%', marginTop: 4 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
