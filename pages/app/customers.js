// pages/app/customers.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { company: '', buyer_contact: '', phone: '', email: '', delivery_address: '', city: '', state: '', zip: '', payment_terms: '' };
const BLANK_LOC = { label: '', address: '', city: '', state: '', zip: '', contact: '', phone: '', notes: '' };

export default function CustomersPage() {
  const [rows, setRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [locOpenFor, setLocOpenFor] = useState(null);
  const [locForm, setLocForm] = useState(BLANK_LOC);
  const [editingLocId, setEditingLocId] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('customers').select('*').order('company');
    setRows(data || []);
    const { data: locs } = await supabase.from('customer_locations').select('*').order('label');
    setLocations(locs || []);
    const { data: hist } = await supabase.from('price_sheet_snapshot_recipients').select('*, price_sheet_snapshots(saved_at, sheet_date, valid_through)').order('customer_id');
    setPriceHistory(hist || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm(r); setEditingId(r.customer_id); setShowForm(true); }
  async function save() {
    if (!form.company) { alert('Company name is required.'); return; }
    if (editingId) {
      const { error } = await supabase.from('customers').update(form).eq('customer_id', editingId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('customers').insert(form);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowForm(false); setEditingId(null); setForm(BLANK);
    load();
  }

  function openAddLoc(customerId) { setLocForm(BLANK_LOC); setEditingLocId(null); setLocOpenFor(customerId); }
  function openEditLoc(loc) { setLocForm(loc); setEditingLocId(loc.location_id); setLocOpenFor(loc.customer_id); }
  async function saveLoc(customerId) {
    if (!locForm.label) { alert('Give this location a label (e.g. "Main Warehouse").'); return; }
    const payload = { ...locForm, customer_id: customerId };
    if (editingLocId) {
      const { error } = await supabase.from('customer_locations').update(payload).eq('location_id', editingLocId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('customer_locations').insert(payload);
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setLocOpenFor(null); setEditingLocId(null); setLocForm(BLANK_LOC);
    load();
  }
  async function deleteLoc(id) {
    if (!confirm('Delete this location?')) return;
    const { error } = await supabase.from('customer_locations').delete().eq('location_id', id);
    if (error) { alert('Delete failed: ' + error.message); return; }
    load();
  }

  return (
    <AppShell title="Customers">
      <button onClick={openAdd} style={btn}>+ Add Customer</button>
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
          <button onClick={save} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>{editingId ? 'Update Customer' : 'Save Customer'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      {rows.map(r => {
        const custLocs = locations.filter(l => l.customer_id === r.customer_id);
        const custHistory = priceHistory.filter(h => h.customer_id === r.customer_id);
        const isOpen = expandedId === r.customer_id;
        return (
          <div key={r.customer_id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setExpandedId(isOpen ? null : r.customer_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', flex: 1 }}>
                <span style={{ color: 'var(--fo-text-dim)', marginRight: 6 }}>{isOpen ? '⌄' : '›'}</span>
                <strong>{r.company}</strong>
                <div style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', marginLeft: 14 }}>{r.buyer_contact} {r.phone && '· ' + r.phone} {r.city && '· ' + r.city + ', ' + r.state} · {custLocs.length} location{custLocs.length === 1 ? '' : 's'} · {custHistory.length} price sheet{custHistory.length === 1 ? '' : 's'} on file</div>
              </button>
              <div>
                <button onClick={() => openEdit(r)} style={editBtn}>Edit</button>
              </div>
            </div>
            {isOpen && (
            <>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fo-border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fo-text-dim)', marginBottom: 6 }}>Locations</div>
              {custLocs.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--fo-text-faint)', marginBottom: 6 }}>No extra locations yet — main profile address is used by default.</div>}
              {custLocs.map(l => (
                <div key={l.location_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span><strong>{l.label}</strong> — {l.address}, {l.city} {l.state}</span>
                  <span>
                    <button onClick={() => openEditLoc(l)} style={{ ...editBtn, padding: '2px 8px', fontSize: 11 }}>Edit</button>{' '}
                    <button onClick={() => deleteLoc(l.location_id)} style={{ ...editBtn, padding: '2px 8px', fontSize: 11, color: 'var(--fo-error)' }}>Delete</button>
                  </span>
                </div>
              ))}
              <button onClick={() => openAddLoc(r.customer_id)} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', marginTop: 6, padding: 0 }}>+ Add Location</button>
              {locOpenFor === r.customer_id && (
                <div style={{ marginTop: 8, ...grid }}>
                  {field('Label (e.g. Main Warehouse)', locForm.label, v => setLocForm({ ...locForm, label: v }))}
                  {field('Address', locForm.address, v => setLocForm({ ...locForm, address: v }))}
                  {field('City', locForm.city, v => setLocForm({ ...locForm, city: v }))}
                  {field('State', locForm.state, v => setLocForm({ ...locForm, state: v }))}
                  {field('ZIP', locForm.zip, v => setLocForm({ ...locForm, zip: v }))}
                  {field('Contact', locForm.contact, v => setLocForm({ ...locForm, contact: v }))}
                  {field('Phone', locForm.phone, v => setLocForm({ ...locForm, phone: v }))}
                  <div style={{ gridColumn: 'span 3' }}>
                    <button onClick={() => saveLoc(r.customer_id)} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 4 }}>Save Location</button>
                    <button onClick={() => setLocOpenFor(null)} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 4, marginLeft: 8 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fo-border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fo-text-dim)', marginBottom: 6 }}>Price Sheet History</div>
              {custHistory.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--fo-text-faint)' }}>No saved price sheets sent to this customer yet.</div>
              ) : (
                custHistory.map(h => (
                  <div key={h.id} style={{ fontSize: 13, padding: '3px 0' }}>
                    Sent {h.price_sheet_snapshots?.saved_at ? new Date(h.price_sheet_snapshots.saved_at).toLocaleDateString() : '—'} — sheet dated {h.price_sheet_snapshots?.sheet_date}, valid through {h.price_sheet_snapshots?.valid_through}
                  </div>
                ))
              )}
            </div>
            </>
            )}
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
const btn = { padding: '10px 18px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 'var(--fo-radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '6px 13px', fontSize: 12.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer', fontWeight: 500 };
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm), var(--fo-glow)', padding: 18, marginBottom: 14 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };
const input = { display: 'block', width: '100%', marginTop: 4 };
