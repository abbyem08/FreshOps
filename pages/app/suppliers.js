// pages/app/suppliers.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { company: '', contact: '', phone: '', email: '', pickup_address: '', city: '', state: '', zip: '', payment_terms: '', paca_license: '' };

export default function SuppliersPage() {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('company');
    setRows(data || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm(r); setEditingId(r.supplier_id); setShowForm(true); }
  async function save() {
    if (!form.company) { alert('Company name is required.'); return; }
    if (editingId) {
      const { error } = await supabase.from('suppliers').update(form).eq('supplier_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('suppliers').insert(form);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
    load();
  }

  return (
    <AppShell title="Suppliers">
      <button onClick={openAdd} style={btn}>+ Add Supplier</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            {field('Company', form.company, v => setForm({ ...form, company: v }))}
            {field('Contact', form.contact, v => setForm({ ...form, contact: v }))}
            {field('Phone', form.phone, v => setForm({ ...form, phone: v }))}
            {field('Email', form.email, v => setForm({ ...form, email: v }))}
            {field('Pickup Address', form.pickup_address, v => setForm({ ...form, pickup_address: v }))}
            {field('City', form.city, v => setForm({ ...form, city: v }))}
            {field('State', form.state, v => setForm({ ...form, state: v }))}
            {field('ZIP', form.zip, v => setForm({ ...form, zip: v }))}
            {field('Payment Terms', form.payment_terms, v => setForm({ ...form, payment_terms: v }))}
            {field('PACA License', form.paca_license, v => setForm({ ...form, paca_license: v }))}
          </div>
          <button onClick={save} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{editingId ? 'Update Supplier' : 'Save Supplier'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <table style={table}>
        <thead><tr style={trHead}><th>Company</th><th>Contact</th><th>Phone</th><th>City</th><th>State</th><th>Terms</th><th>PACA</th><th></th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.supplier_id} style={tr}>
            <td>{r.company}</td><td>{r.contact}</td><td>{r.phone}</td><td>{r.city}</td><td>{r.state}</td><td>{r.payment_terms}</td><td>{r.paca_license}</td>
            <td><button onClick={() => openEdit(r)} style={editBtn}>Edit</button></td>
          </tr>
        ))}</tbody>
      </table>
    </AppShell>
  );
}

function field(label, value, onChange) {
  return (
    <label style={{ fontSize: 13 }}>{label}
      <input value={value || ''} onChange={e => onChange(e.target.value)} style={input} />
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
