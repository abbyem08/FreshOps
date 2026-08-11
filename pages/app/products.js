// pages/app/products.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { commodity: '', pack_size: '', gross_weight_per_case: '', cases_per_pallet: '', default_origin: '', image_url: '' };

export function ProductsContent() {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('products').select('*').order('commodity');
    setRows(data || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm(r); setEditingId(r.product_id); setShowForm(true); }
  async function toggleActive(r) {
    const goingInactive = r.active !== false;
    if (goingInactive && !confirm(`Deactivate ${r.commodity} — ${r.pack_size}? It'll disappear from order/allocation pickers, but all existing orders and history stay exactly as-is. You can reactivate anytime.`)) return;
    const { error } = await supabase.from('products').update({ active: !goingInactive }).eq('product_id', r.product_id);
    if (error) { alert('Failed: ' + error.message); return; }
    load();
  }
  async function save() {
    if (!form.commodity || !form.pack_size) { alert('Commodity and Pack Size are required.'); return; }
    const payload = {
      commodity: form.commodity, pack_size: form.pack_size, default_origin: form.default_origin, image_url: form.image_url || null,
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
    <>
      <button onClick={openAdd} style={btn}>+ Add Product</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            {field('Commodity', form.commodity, v => setForm({ ...form, commodity: v }))}
            {field('Pack Size', form.pack_size, v => setForm({ ...form, pack_size: v }))}
            {field('Weight / Case (lb)', form.gross_weight_per_case, v => setForm({ ...form, gross_weight_per_case: v }))}
            {field('Cases / Pallet', form.cases_per_pallet, v => setForm({ ...form, cases_per_pallet: v }))}
            {field('Default Origin', form.default_origin, v => setForm({ ...form, default_origin: v }))}
            {field('Image URL (optional)', form.image_url, v => setForm({ ...form, image_url: v }))}
          </div>
          <button onClick={save} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>{editingId ? 'Update Product' : 'Save Product'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <label style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show inactive
      </label>
      <table style={table} className="fo-table">
        <thead><tr style={trHead}><th>Commodity</th><th>Pack Size</th><th style={{ textAlign: 'right' }}>Weight/Case</th><th style={{ textAlign: 'right' }}>Cases/Pallet</th><th>Origin</th><th></th></tr></thead>
        <tbody>{rows.filter(r => showInactive || r.active !== false).map(r => (
          <tr key={r.product_id} style={{ ...tr, opacity: r.active === false ? 0.6 : 1 }}>
            <td>{r.image_url && <img src={r.image_url} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4, verticalAlign: 'middle', marginRight: 6 }} onError={e => { e.target.style.display = 'none'; }} />}{r.commodity}{r.active === false && <span className="fo-badge fo-badge-gray" style={{ marginLeft: 8 }}>Inactive</span>}</td><td>{r.pack_size}</td><td style={{ textAlign: 'right' }}>{r.gross_weight_per_case}</td><td style={{ textAlign: 'right' }}>{r.cases_per_pallet}</td><td>{r.default_origin}</td>
            <td><button onClick={() => openEdit(r)} style={editBtn}>Edit</button> <button onClick={() => toggleActive(r)} style={{ ...editBtn, color: r.active === false ? 'var(--fo-success)' : 'var(--fo-error)' }}>{r.active === false ? 'Reactivate' : 'Deactivate'}</button></td>
          </tr>
        ))}</tbody>
      </table>
    </>
  );
}

export default function ProductsPage() {
  return <AppShell title="Product Master"><ProductsContent /></AppShell>;
}

function field(label, value, onChange) {
  return (
    <label style={{ fontSize: 13 }}>{label}
      <input value={value ?? ''} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}
const btn = { padding: '10px 18px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 'var(--fo-radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '6px 13px', fontSize: 12.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer', fontWeight: 500 };
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm), var(--fo-glow)', padding: 18, marginBottom: 16 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };
const input = { display: 'block', width: '100%', marginTop: 4 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
