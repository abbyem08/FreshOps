// pages/app/customers.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ company: '', buyer_contact: '', phone: '', email: '', delivery_address: '', city: '', state: '', zip: '', payment_terms: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('customers').select('*').order('company');
    setRows(data || []);
  }
  async function save() {
    await supabase.from('customers').insert(form);
    setForm({ company: '', buyer_contact: '', phone: '', email: '', delivery_address: '', city: '', state: '', zip: '', payment_terms: '' });
    setShowForm(false);
    load();
  }

  return (
    <AppShell title="Customers">
      <button onClick={() => setShowForm(!showForm)} style={btn}>+ Add Customer</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            {field('Company', form.company, v => setForm({ ...form, company: v }))}
            {field('Buyer Contact', form.buyer_contact, v => setForm({ ...form, buyer_contact: v }))}
            {field('Phone', form.phone, v => setForm({ ...form, phone: v }))}
            {field('Email', form.email, v => setForm({ ...form, email: v }))}
            {field('Delivery Address', form.delivery_address, v => setForm({ ...form, delivery_address: v }))}
            {field('City', form.city, v => setForm({ ...form, city: v }))}
            {field('State', form.state, v => setForm({ ...form, state: v }))}
            {field('ZIP', form.zip, v => setForm({ ...form, zip: v }))}
            {field('Payment Terms', form.payment_terms, v => setForm({ ...form, payment_terms: v }))}
          </div>
          <button onClick={save} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>Save Customer</button>
        </div>
      )}
      <table style={table}>
        <thead><tr style={trHead}><th>Company</th><th>Contact</th><th>Phone</th><th>City</th><th>State</th><th>Terms</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.customer_id} style={tr}><td>{r.company}</td><td>{r.buyer_contact}</td><td>{r.phone}</td><td>{r.city}</td><td>{r.state}</td><td>{r.payment_terms}</td></tr>
        ))}</tbody>
      </table>
    </AppShell>
  );
}

function field(label, value, onChange) {
  return (
    <label style={{ fontSize: 13 }}>{label}
      <input value={value} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}
const btn = { padding: '8px 16px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 16 };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16, marginBottom: 16 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
const input = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
const table = { width: '100%', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
