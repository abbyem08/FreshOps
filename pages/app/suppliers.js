// pages/app/suppliers.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK = { company: '', contact: '', phone: '', email: '', pickup_address: '', city: '', state: '', zip: '', payment_terms: '', paca_license: '', per_case_fee: '', per_case_fee_notes: '' };
const BLANK_LOC = { label: '', address: '', city: '', state: '', zip: '', contact: '', phone: '', notes: '' };

export function SuppliersContent() {
  const [rows, setRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [locOpenFor, setLocOpenFor] = useState(null);
  const [locForm, setLocForm] = useState(BLANK_LOC);
  const [editingLocId, setEditingLocId] = useState(null);
  const [quoteHistory, setQuoteHistory] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    const { data } = await supabase.from('suppliers').select('*').order('company');
    setRows(data || []);
    const { data: locs } = await supabase.from('supplier_locations').select('*').order('label');
    setLocations(locs || []);
    const { data: hist } = await supabase.from('price_sheet_snapshot_lines').select('*, price_sheet_snapshots(saved_at, sheet_date)').order('supplier_id');
    setQuoteHistory(hist || []);
  }
  function openAdd() { setForm(BLANK); setEditingId(null); setShowForm(true); }
  function openEdit(r) { setForm(r); setEditingId(r.supplier_id); setShowForm(true); }
  async function toggleActive(r) {
    const goingInactive = r.active !== false;
    if (goingInactive && !confirm(`Deactivate ${r.company}? They'll disappear from purchasing pickers, but all existing purchases and history stay exactly as-is. You can reactivate anytime.`)) return;
    const { error } = await supabase.from('suppliers').update({ active: !goingInactive }).eq('supplier_id', r.supplier_id);
    if (error) { alert('Failed: ' + error.message); return; }
    load();
  }
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
    <>
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
          <button onClick={save} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>{editingId ? 'Update Supplier' : 'Save Supplier'}</button>
          <button onClick={() => { setShowForm(false); setEditingId(null); }} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}
      <label style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show inactive
      </label>
      {rows.filter(r => showInactive || r.active !== false).map(r => {
        const supLocs = locations.filter(l => l.supplier_id === r.supplier_id);
        const supHistory = quoteHistory.filter(h => h.supplier_id === r.supplier_id);
        const isOpen = expandedId === r.supplier_id;
        return (
          <div key={r.supplier_id} style={{ ...card, opacity: r.active === false ? 0.6 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setExpandedId(isOpen ? null : r.supplier_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', flex: 1 }}>
                <span style={{ color: 'var(--fo-text-dim)', marginRight: 6 }}>{isOpen ? '⌄' : '›'}</span>
                <strong>{r.company}</strong>{r.active === false && <span className="fo-badge fo-badge-gray" style={{ marginLeft: 8 }}>Inactive</span>}
                <div style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', marginLeft: 14 }}>{r.contact} {r.phone && '· ' + r.phone} {r.city && '· ' + r.city + ', ' + r.state} {r.per_case_fee ? `· $${Number(r.per_case_fee).toFixed(2)}/cs fee` : ''} · {supLocs.length} location{supLocs.length === 1 ? '' : 's'} · {supHistory.length} quote{supHistory.length === 1 ? '' : 's'} on file</div>
              </button>
              <div>
                <button onClick={() => openEdit(r)} style={editBtn}>Edit</button>
                <button onClick={() => toggleActive(r)} style={{ ...editBtn, marginLeft: 6, color: r.active === false ? 'var(--fo-success)' : 'var(--fo-error)' }}>{r.active === false ? 'Reactivate' : 'Deactivate'}</button>
              </div>
            </div>
            {isOpen && (
            <>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fo-border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fo-text-dim)', marginBottom: 6 }}>Locations</div>
              {supLocs.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--fo-text-faint)', marginBottom: 6 }}>No extra locations yet — main profile address is used by default.</div>}
              {supLocs.map(l => (
                <div key={l.location_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                  <span><strong>{l.label}</strong> — {l.address}, {l.city} {l.state}</span>
                  <span>
                    <button onClick={() => openEditLoc(l)} style={{ ...editBtn, padding: '2px 8px', fontSize: 11 }}>Edit</button>{' '}
                    <button onClick={() => deleteLoc(l.location_id)} style={{ ...editBtn, padding: '2px 8px', fontSize: 11, color: 'var(--fo-error)' }}>Delete</button>
                  </span>
                </div>
              ))}
              <button onClick={() => openAddLoc(r.supplier_id)} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', marginTop: 6, padding: 0 }}>+ Add Location</button>
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
                    <button onClick={() => saveLoc(r.supplier_id)} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 4 }}>Save Location</button>
                    <button onClick={() => setLocOpenFor(null)} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 4, marginLeft: 8 }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--fo-border)' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fo-text-dim)', marginBottom: 6 }}>Quote History</div>
              {supHistory.length === 0 ? (
                <div style={{ fontSize: 12.5, color: 'var(--fo-text-faint)' }}>No saved price sheet quotes from this supplier yet.</div>
              ) : (
                supHistory.map(h => (
                  <div key={h.snapshot_line_id} style={{ fontSize: 13, padding: '3px 0' }}>
                    {h.price_sheet_snapshots?.sheet_date} — {h.commodity} {h.pack_size} — ${Number(h.raw_cost || 0).toFixed(2)}/cs raw
                  </div>
                ))
              )}
            </div>
            </>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function SuppliersPage() {
  return <AppShell title="Suppliers"><SuppliersContent /></AppShell>;
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
