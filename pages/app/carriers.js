// pages/app/carriers.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { name: '', mc_number: '', dot_number: '', insurance_expiry: '', contact: '', phone: '' };

export default function CarriersPage() {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('carriers').select('*').order('name');
    setRows(data || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm(r); setEditingId(r.carrier_id); setShowForm(true); }
  async function save() {
    if (!form.name) { alert('Carrier name is required.'); return; }
    if (editingId) {
      const { error } = await supabase.from('carriers').update(form).eq('carrier_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('carriers').insert(form);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
    load();
  }

  function daysUntil(dateStr) {
    if (!dateStr) return Infinity;
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  }

  return (
    <AppShell title="Carriers">
      <button onClick={openAdd} style={btn}>+ Add Carrier</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            {field('Carrier Name', form.name, v => setForm({ ...form, name: v }))}
            {field('MC #', form.mc_number, v => setForm({ ...form, mc_number: v }))}
            {field('DOT #', form.dot_number, v => setForm({ ...form, dot_number: v }))}
            <label style={{ fontSize: 13 }}>Insurance Expiry
              <input type="date" value={form.insurance_expiry || ''} onChange={e => setForm({ ...form, insurance_expiry: e.target.value })} style={input} />
            </label>
            {field('Contact', form.contact, v => setForm({ ...form, contact: v }))}
            {field('Phone', form.phone, v => setForm({ ...form, phone: v }))}
          </div>
          <button onClick={save} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>{editingId ? 'Update Carrier' : 'Save Carrier'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <table style={table} className="fo-table">
        <thead><tr style={trHead}><th>Carrier</th><th>MC #</th><th>DOT #</th><th>Insurance Expiry</th><th>Contact</th><th>Phone</th><th></th></tr></thead>
        <tbody>{rows.map(r => {
          const soon = daysUntil(r.insurance_expiry) <= 30;
          return (
            <tr key={r.carrier_id} style={tr}>
              <td>{r.name}</td><td>{r.mc_number}</td><td>{r.dot_number}</td>
              <td style={{ color: soon ? 'var(--fo-error)' : 'inherit' }}>{r.insurance_expiry} {soon && '⚠'}</td>
              <td>{r.contact}</td><td>{r.phone}</td>
              <td><button onClick={() => openEdit(r)} style={editBtn}>Edit</button></td>
            </tr>
          );
        })}</tbody>
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
const btn = { padding: '10px 18px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 'var(--fo-radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '6px 13px', fontSize: 12.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer', fontWeight: 500 };
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm), var(--fo-glow)', padding: 18, marginBottom: 16 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };
const input = { display: 'block', width: '100%', marginTop: 4 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
