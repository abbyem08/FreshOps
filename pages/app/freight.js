// pages/app/freight.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { jacket_id: '', carrier: '', trip_type: 'One Pick/One Drop', quoted_rate: '', booked_rate: '', miles: '', status: 'Quoted', carrier_invoice_number: '', invoice_received: false, carrier_paid: false };
const TRIP_TYPES = ['One Pick/One Drop', 'Multi Pick/One Drop', 'One Pick/Multi Drop', 'Multi Pick/Multi Drop'];

export default function FreightPage() {
  const [rows, setRows] = useState([]);
  const [jackets, setJackets] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loadedByJacket, setLoadedByJacket] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);

  useEffect(() => { load(); }, []);

  async function load() {
    const [f, j, c, jl] = await Promise.all([
      supabase.from('freight_records').select('*, jackets(jacket_number)').order('quote_date', { ascending: false }),
      supabase.from('jackets').select('jacket_id, jacket_number').order('jacket_number'),
      supabase.from('carriers').select('carrier_id, name').order('name'),
      supabase.from('jacket_lines').select('jacket_id, actual_cases_loaded'),
    ]);
    setRows(f.data || []);
    setJackets(j.data || []);
    setCarriers(c.data || []);
    const loaded = {};
    (jl.data || []).forEach(l => { loaded[l.jacket_id] = (loaded[l.jacket_id] || 0) + Number(l.actual_cases_loaded || 0); });
    setLoadedByJacket(loaded);
  }

  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) {
    setForm({ jacket_id: r.jacket_id, carrier: r.carrier || '', trip_type: r.trip_type || TRIP_TYPES[0], quoted_rate: r.quoted_rate ?? '', booked_rate: r.booked_rate ?? '', miles: r.miles ?? '', status: r.status || 'Quoted', carrier_invoice_number: r.carrier_invoice_number || '', invoice_received: !!r.invoice_received, carrier_paid: !!r.carrier_paid });
    setEditingId(r.freight_id);
    setShowForm(true);
  }
  async function save() {
    if (!form.jacket_id || !form.carrier) { alert('Jacket and Carrier are required.'); return; }
    const payload = {
      jacket_id: Number(form.jacket_id),
      carrier: form.carrier,
      trip_type: form.trip_type,
      quoted_rate: form.quoted_rate ? Number(form.quoted_rate) : null,
      booked_rate: form.booked_rate ? Number(form.booked_rate) : null,
      miles: form.miles ? Number(form.miles) : null,
      status: form.status,
      carrier_invoice_number: form.carrier_invoice_number || null,
      invoice_received: form.invoice_received,
      carrier_paid: form.carrier_paid,
      quote_date: editingId ? undefined : new Date().toISOString().slice(0, 10),
    };
    if (editingId) {
      const { error } = await supabase.from('freight_records').update(payload).eq('freight_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('freight_records').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
    load();
  }

  return (
    <AppShell title="Freight">
      <button onClick={openAdd} style={btn}>+ Add Freight Record</button>
      {showForm && (
        <div style={card}>
          <div style={grid}>
            <label style={{ fontSize: 13 }}>Jacket
              <select value={form.jacket_id} onChange={e => setForm({ ...form, jacket_id: e.target.value })} style={input}>
                <option value="">— select —</option>
                {jackets.map(j => <option key={j.jacket_id} value={j.jacket_id}>{j.jacket_number}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>Carrier
              <select value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} style={input}>
                <option value="">— select —</option>
                {carriers.map(c => <option key={c.carrier_id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>Trip Type
              <select value={form.trip_type} onChange={e => setForm({ ...form, trip_type: e.target.value })} style={input}>
                {TRIP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </label>
            {field('Quoted Rate ($)', form.quoted_rate, v => setForm({ ...form, quoted_rate: v }), 'number')}
            {field('Booked Rate ($)', form.booked_rate, v => setForm({ ...form, booked_rate: v }), 'number')}
            {field('Miles', form.miles, v => setForm({ ...form, miles: v }), 'number')}
            <label style={{ fontSize: 13 }}>Status
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input}>
                <option>Quoted</option><option>Booked</option>
              </select>
            </label>
            {field('Carrier Invoice #', form.carrier_invoice_number, v => setForm({ ...form, carrier_invoice_number: v }))}
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
              <input type="checkbox" checked={form.invoice_received} onChange={e => setForm({ ...form, invoice_received: e.target.checked })} /> Invoice Received
            </label>
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
              <input type="checkbox" checked={form.carrier_paid} onChange={e => setForm({ ...form, carrier_paid: e.target.checked })} /> Carrier Paid
            </label>
          </div>
          <button onClick={save} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{editingId ? 'Update Record' : 'Save Record'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <table style={table}>
        <thead><tr style={trHead}><th>Jacket</th><th>Carrier</th><th>Trip Type</th><th style={{ textAlign: 'right' }}>Miles</th><th style={{ textAlign: 'right' }}>Booked Rate</th><th style={{ textAlign: 'right' }}>$/Mile</th><th style={{ textAlign: 'right' }}>Loaded Cases</th><th style={{ textAlign: 'right' }}>$/Case</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.map(r => {
          const loaded = loadedByJacket[r.jacket_id] || 0;
          const perMile = r.miles ? (r.booked_rate / r.miles).toFixed(2) : '—';
          const perCase = loaded > 0 && r.booked_rate ? (r.booked_rate / loaded).toFixed(2) : '—';
          return (
            <tr key={r.freight_id} style={tr}>
              <td style={{ fontFamily: 'monospace' }}>{r.jackets?.jacket_number}</td>
              <td>{r.carrier}</td><td>{r.trip_type}</td>
              <td style={{ textAlign: 'right' }}>{r.miles}</td>
              <td style={{ textAlign: 'right' }}>${r.booked_rate?.toLocaleString()}</td>
              <td style={{ textAlign: 'right' }}>${perMile}</td>
              <td style={{ textAlign: 'right' }}>{loaded}</td>
              <td style={{ textAlign: 'right' }}>${perCase}</td>
              <td>{r.status}</td>
              <td><button onClick={() => openEdit(r)} style={editBtn}>Edit</button></td>
            </tr>
          );
        })}</tbody>
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
