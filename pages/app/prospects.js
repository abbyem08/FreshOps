// pages/app/prospects.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { prospect_type: 'Customer', company: '', contact: '', phone: '', email: '', status: 'New', last_contact_date: '', next_followup_date: '', notes: '' };
const STATUSES = ['New', 'Contacted', 'Quoted', 'Negotiating', 'Won', 'Lost'];

export default function ProspectsPage() {
  const [rows, setRows] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('prospects').select('*').order('next_followup_date', { ascending: true, nullsFirst: false });
    setRows(data || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm({ ...BLANK, ...r }); setEditingId(r.prospect_id); setShowForm(true); }
  async function save() {
    if (!form.company) { alert('Company name is required.'); return; }
    const payload = { ...form, last_contact_date: form.last_contact_date || null, next_followup_date: form.next_followup_date || null };
    if (editingId) {
      const { error } = await supabase.from('prospects').update(payload).eq('prospect_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('prospects').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
    load();
  }

  function daysUntil(d) { if (!d) return Infinity; return Math.ceil((new Date(d) - new Date()) / 86400000); }

  return (
    <AppShell title="Prospects">
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 16 }}>Potential customers and suppliers you haven't converted yet — track who to call and when.</div>
      <button onClick={openAdd} style={btn}>+ Add Prospect</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            <label style={{ fontSize: 13 }}>Type
              <select value={form.prospect_type} onChange={e => setForm({ ...form, prospect_type: e.target.value })} style={input}>
                <option>Customer</option><option>Supplier</option>
              </select>
            </label>
            {field('Company', form.company, v => setForm({ ...form, company: v }))}
            {field('Contact', form.contact, v => setForm({ ...form, contact: v }))}
            {field('Phone', form.phone, v => setForm({ ...form, phone: v }))}
            {field('Email', form.email, v => setForm({ ...form, email: v }))}
            <label style={{ fontSize: 13 }}>Status
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>Last Contact<input type="date" value={form.last_contact_date || ''} onChange={e => setForm({ ...form, last_contact_date: e.target.value })} style={input} /></label>
            <label style={{ fontSize: 13 }}>Next Follow-up<input type="date" value={form.next_followup_date || ''} onChange={e => setForm({ ...form, next_followup_date: e.target.value })} style={input} /></label>
            {field('Notes', form.notes, v => setForm({ ...form, notes: v }))}
          </div>
          <button onClick={save} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{editingId ? 'Update Prospect' : 'Save Prospect'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <table style={table}>
        <thead><tr style={trHead}><th>Type</th><th>Company</th><th>Contact</th><th>Phone</th><th>Status</th><th>Next Follow-up</th><th></th></tr></thead>
        <tbody>{rows.map(r => {
          const due = daysUntil(r.next_followup_date) <= 3;
          return (
            <tr key={r.prospect_id} style={tr}>
              <td>{r.prospect_type}</td><td>{r.company}</td><td>{r.contact}</td><td>{r.phone}</td><td>{r.status}</td>
              <td style={{ color: due ? '#C0562D' : 'inherit', fontWeight: due ? 600 : 400 }}>{r.next_followup_date || '—'}</td>
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
const btn = { padding: '8px 16px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16, marginBottom: 16 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
const input = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
const table = { width: '100%', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
