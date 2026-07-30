// pages/app/calls.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { call_date: '', party_type: 'Supplier', party_id: '', contact_name: '', phone: '', product_id: '', price: '', price_type: 'FOB', availability: '', notes: '', followup_date: '', status: 'Quoted' };

export default function CallsPage() {
  const [calls, setCalls] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);

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

  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(c) {
    setForm({
      call_date: c.call_date || '', party_type: c.party_type, party_id: c.party_type === 'Supplier' ? c.supplier_id : c.customer_id,
      contact_name: c.contact_name || '', phone: c.phone || '', product_id: c.product_id, price: c.price ?? '', price_type: c.price_type || 'FOB',
      availability: c.availability || '', notes: c.notes || '', followup_date: c.followup_date || '', status: c.status,
    });
    setEditingId(c.call_id);
    setShowForm(true);
  }

  async function saveCall() {
    if (!form.party_id || !form.product_id) { alert('Party and Product are both required.'); return; }
    const payload = {
      call_date: form.call_date || new Date().toISOString().slice(0, 10),
      party_type: form.party_type,
      supplier_id: form.party_type === 'Supplier' ? Number(form.party_id) : null,
      customer_id: form.party_type === 'Customer' ? Number(form.party_id) : null,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      product_id: Number(form.product_id),
      price: form.price ? Number(form.price) : null,
      price_type: form.price_type,
      availability: form.availability || null,
      notes: form.notes || null,
      followup_date: form.followup_date || null,
      status: form.status,
    };
    if (editingId) {
      const { error } = await supabase.from('call_log').update(payload).eq('call_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('call_log').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setForm(BLANK); setEditingId(null); setShowForm(false);
    loadAll();
  }

  const partyList = form.party_type === 'Supplier' ? suppliers : customers;
  const partyIdKey = form.party_type === 'Supplier' ? 'supplier_id' : 'customer_id';

  return (
    <AppShell title="Market Calls">
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 16 }}>Every call to a supplier or customer — and any price quoted — lives here. Price Sheets pull straight from these entries.</div>
      <button onClick={openAdd} style={btn}>+ Log Call</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            <label style={{ fontSize: 13 }}>Date<input type="date" value={form.call_date} onChange={e => setForm({ ...form, call_date: e.target.value })} style={input} /></label>
            <label style={{ fontSize: 13 }}>Party Type
              <select value={form.party_type} onChange={e => setForm({ ...form, party_type: e.target.value, party_id: '' })} style={input}>
                <option>Supplier</option><option>Customer</option>
              </select>
            </label>
            <label style={{ fontSize: 13 }}>{form.party_type}
              <select value={form.party_id} onChange={e => setForm({ ...form, party_id: e.target.value })} style={input}>
                <option value="">— select —</option>
                {partyList.map(p => <option key={p[partyIdKey]} value={p[partyIdKey]}>{p.company}</option>)}
              </select>
            </label>
            {field('Contact Name', form.contact_name, v => setForm({ ...form, contact_name: v }))}
            {field('Phone', form.phone, v => setForm({ ...form, phone: v }))}
            <label style={{ fontSize: 13 }}>Product
              <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} style={input}>
                <option value="">— select —</option>
                {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
              </select>
            </label>
            {field('Price ($/case)', form.price, v => setForm({ ...form, price: v }), 'number')}
            <label style={{ fontSize: 13 }}>Price Type
              <select value={form.price_type} onChange={e => setForm({ ...form, price_type: e.target.value })} style={input}>
                <option>FOB</option><option>Delivered</option>
              </select>
            </label>
            {field('Availability / Market Notes', form.availability, v => setForm({ ...form, availability: v }))}
            <label style={{ fontSize: 13 }}>Follow-up Date<input type="date" value={form.followup_date} onChange={e => setForm({ ...form, followup_date: e.target.value })} style={input} /></label>
            <label style={{ fontSize: 13 }}>Status
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>
                <option>Quoted</option><option>Follow-up</option><option>Booked</option><option>Passed</option>
              </select>
            </label>
            {field('Notes', form.notes, v => setForm({ ...form, notes: v }))}
          </div>
          <button onClick={saveCall} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{editingId ? 'Update Call' : 'Save Call'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <table style={table}>
        <thead><tr style={trHead}><th>Date</th><th>Party</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Price</th><th>Availability</th><th>Follow-up</th><th>Status</th><th></th></tr></thead>
        <tbody>{calls.map(c => (
          <tr key={c.call_id} style={tr}>
            <td style={{ color: '#78716c', fontSize: 12 }}>{c.call_date}</td>
            <td>{partyLabel(c)}</td>
            <td>{c.products?.commodity} — {c.products?.pack_size}</td>
            <td style={{ textAlign: 'right' }}>{c.price != null ? `$${Number(c.price).toFixed(2)} ${c.price_type}` : '—'}</td>
            <td style={{ color: '#78716c', fontSize: 12 }}>{c.availability}</td>
            <td style={{ color: '#78716c', fontSize: 12 }}>{c.followup_date || '—'}</td>
            <td>{c.status}</td>
            <td><button onClick={() => openEdit(c)} style={editBtn}>Edit</button></td>
          </tr>
        ))}</tbody>
      </table>
    </AppShell>
  );
}

function field(label, value, onChange, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>{label}
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}
const btn = { padding: '8px 16px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16, marginBottom: 16 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
const input = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
const table = { width: '100%', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
