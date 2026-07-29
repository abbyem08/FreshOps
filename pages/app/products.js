// pages/app/products.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { commodity: '', pack_size: '', gross_weight_per_case: '', cases_per_pallet: '', default_origin: '' };

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('products').select('*').order('commodity');
    setRows(data || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm(r); setEditingId(r.product_id); setShowForm(true); }
  async function save() {
    if (!form.commodity || !form.pack_size) { alert('Commodity and Pack Size are required.'); return; }
    const payload = {
      commodity: form.commodity, pack_size: form.pack_size, default_origin: form.default_origin,
      gross_weight_per_case: form.gross_weight_per_case ? Number(form.gross_weight_per_case) : null,
      cases_per_pallet: form.cases_per_pallet ? Number(form.cases_per_pallet) : null
    };
    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('product_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
    load();
  }

  return (
    <AppShell title="Product Master">
      <button onClick={openAdd} style={btn}>+ Add Product</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            {field('Commodity', form.commodity, v => setForm({ ...form, commodity: v }))}
            {field('Pack Size', form.pack_size, v => setForm({ ...form, pack_size: v }))}
            {field('Weight / Case (lb)', form.gross_weight_per_case, v => setForm({ ...form, gross_weight_per_case: v }))}
            {field('Cases / Pallet', form.cases_per_pallet, v => setForm({ ...form, cases_per_pallet: v }))}
            {field('Default Origin', form.default_origin, v => setForm({ ...form, default_origin: v }))}
          </div>
          <button onClick={save} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{editingId ? 'Update Product' : 'Save Product'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <table style={table}>
        <thead><tr style={trHead}><th>Commodity</th><th>Pack Size</th><th style={{ textAlign: 'right' }}>Weight/Case</th><th style={{ textAlign: 'right' }}>Cases/Pallet</th><th>Origin</th><th></th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.product_id} style={tr}>
            <td>{r.commodity}</td><td>{r.pack_size}</td><td style={{ textAlign: 'right' }}>{r.gross_weight_per_case}</td><td style={{ textAlign: 'right' }}>{r.cases_per_pallet}</td><td>{r.default_origin}</td>
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
      <input value={value ?? ''} onChange={e => onChange(e.target.value)} style={input} />
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
