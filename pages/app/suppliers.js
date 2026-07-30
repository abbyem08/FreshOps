// pages/app/suppliers.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { company: '', contact: '', phone: '', email: '', pickup_address: '', city: '', state: '', zip: '', payment_terms: '', paca_license: '', per_case_fee: '', per_case_fee_notes: '' };
const BLANK_LOC = { label: '', address: '', city: '', state: '', zip: '', contact: '', phone: '', notes: '' };

export default function SuppliersPage() {
  const [rows, setRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [locOpenFor, setLocOpenFor] = useState(null);
  const [locForm, setLocForm] = useState(BLANK_LOC);
  const [editingLocId, setEditingLocId] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('company');
    setRows(data || []);
    const { data: locs } = await supabase.from('supplier_locations').select('*').order('label');
    setLocations(locs || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm(r); setEditingId(r.supplier_id); setShowForm(true); }
  async function save() {
    if (!form.company) { alert('Company name is required.'); return; }
    const payload = { ...form, per_case_fee: form.per_case_fee === '' ? 0 : Number(form.per_case_fee) };
    if (editingId) {
      const { error } = await supabase.from('suppliers').update(payload).eq('supplier_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('suppliers').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
    load();
  }

  function openAddLoc(supplierId) { setLocForm(BLANK_LOC); setEditingLocId(null); setLocOpenFor(supplierId); }
  function openEditLoc(loc) { setLocForm(loc); setEditingLocId(loc.location_id); setLocOpenFor(loc.supplier_id); }
  async function saveLoc(supplierId) {
    if (!locForm.label) { alert('Give this location a label (e.g. "North Yard").'); return; }
    const payload = { ...locForm, supplier_id: supplierId };
    if (editingLocId) {
      const { error } = await supabase.from('supplier_locations').update(payload).eq('location_id', editingLocId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('supplier_locations').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setLocOpenFor(null); setEditingLocId(null); setLocForm(BLANK_LOC);
    load();
  }
  async function deleteLoc(id) {
    if (!confirm('Delete this location?')) return;
    const { error } = await supabase.from('supplier_locations').delete().eq('location_id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
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
            {field('Per-Case Fee ($)', form.per_case_fee, v => setForm({ ...form, per_case_fee: v }))}
            {field('Per-Case Fee Notes', form.per_case_fee_notes, v => setForm({ ...form, per_case_fee_notes: v }))}
          </div>
          <button onClick={save} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{editingId ? 'Update Supplier' : 'Save Supplier'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      {rows.map(r => {
        const supLocs = locations.filter(l => l.supplier_id === r.supplier_id);
        return (
          <div key={r.supplier_id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{r.company}</strong>
                <div style={{ fontSize: 12.5, color: '#78716c' }}>{r.contact} {r.phone && '· ' + r.phone} {r.city && '· ' + r.city + ', ' + r.state} {r.per_case_fee ? `· $${Number(r.per_case_fee).toFixed(2)}/cs fee` : ''}</div>
              </div>
              <div><button onClick={() => openEdit(r)} style={editBtn}>Edit</button></div>
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #DCD5C1' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#78716c', marginBottom: 6 }}>Locations</div>
              {supLocs.length === 0 && <div style={{ fontSize: 12.5, color: '#a8a29e', marginBottom: 6 }}>No extra locations yet — main profile address is used by default.</div>}
              {supLocs.map(l => (
                <div key={l.location_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span><strong>{l.label}</strong> — {l.address}, {l.city} {l.state}</span>
                  <span>
                    <button onClick={() => openEditLoc(l)} style={{ ...editBtn, padding: '2px 8px', fontSize: 11 }}>Edit</button>{' '}
                    <button onClick={() => deleteLoc(l.location_id)} style={{ ...editBtn, padding: '2px 8px', fontSize: 11, color: '#C0562D' }}>Delete</button>
                  </span>
                </div>
              ))}
              <button onClick={() => openAddLoc(r.supplier_id)} style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', marginTop: 6, padding: 0 }}>+ Add Location</button>
              {locOpenFor === r.supplier_id && (
                <div style={{ marginTop: 8, ...grid }}>
                  {field('Label (e.g. North Yard)', locForm.label, v => setLocForm({ ...locForm, label: v }))}
                  {field('Address', locForm.address, v => setLocForm({ ...locForm, address: v }))}
                  {field('City', locForm.city, v => setLocForm({ ...locForm, city: v }))}
                  {field('State', locForm.state, v => setLocForm({ ...locForm, state: v }))}
                  {field('ZIP', locForm.zip, v => setLocForm({ ...locForm, zip: v }))}
                  {field('Contact', locForm.contact, v => setLocForm({ ...locForm, contact: v }))}
                  {field('Phone', locForm.phone, v => setLocForm({ ...locForm, phone: v }))}
                  <div style={{ gridColumn: 'span 3' }}>
                    <button onClick={() => saveLoc(r.supplier_id)} style={{ ...btn, background: '#6B8E4E', marginTop: 4 }}>Save Location</button>
                    <button onClick={() => setLocOpenFor(null)} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 4, marginLeft: 8 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
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
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16, marginBottom: 12 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
const input = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
