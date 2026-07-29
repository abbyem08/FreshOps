// pages/app/ops.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function OpsPage() {
  const [lines, setLines] = useState([]);
  const [claims, setClaims] = useState([]);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimForm, setClaimForm] = useState({ jacket_line_id: '', claim_type: 'Quality', description: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: jl } = await supabase
      .from('jacket_lines')
      .select('*, jackets(jacket_number), order_lines(products(commodity, pack_size))')
      .order('updated_at', { ascending: false });
    setLines(jl || []);
    const { data: c } = await supabase.from('claims').select('*, jacket_lines(order_lines(products(commodity, pack_size)))').order('date_opened', { ascending: false });
    setClaims(c || []);
  }

  async function updateField(id, field, value) {
    const { error } = await supabase.from('jacket_lines').update({ [field]: value, updated_at: new Date().toISOString() }).eq('jacket_line_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }

  async function saveClaim() {
    if (!claimForm.jacket_line_id || !claimForm.description) { alert('Pick a jacket line and describe the issue.'); return; }
    const { error } = await supabase.from('claims').insert({
      jacket_line_id: Number(claimForm.jacket_line_id),
      claim_type: claimForm.claim_type,
      description: claimForm.description,
      status: 'Open'
    });
    if (error) { alert('Save failed: ' + error.message); return; }
    setClaimForm({ jacket_line_id: '', claim_type: 'Quality', description: '' });
    setShowClaimForm(false);
    load();
  }

  const statusOptions = ['Planned', 'Loading', 'Loaded', 'In Transit', 'Delivered', 'Short', 'Exception'];

  return (
    <AppShell title="Operations Log">
      {lines.length === 0 ? (
        <p style={{ color: '#a8a29e' }}>No jacket lines yet — assign order lines to a Jacket first.</p>
      ) : (
        <table style={table}>
          <thead><tr style={trHead}><th>Jacket</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th>Actual Loaded</th><th>Actual Delivered</th><th>BOL #</th><th>Status</th><th>Exception / Notes</th></tr></thead>
          <tbody>{lines.map(jl => (
            <tr key={jl.jacket_line_id} style={tr}>
              <td style={{ fontFamily: 'monospace' }}>{jl.jackets?.jacket_number}</td>
              <td>{jl.order_lines?.products?.commodity} — {jl.order_lines?.products?.pack_size}</td>
              <td style={{ textAlign: 'right' }}>{jl.cases_to_load}</td>
              <td><input type="number" defaultValue={jl.actual_cases_loaded} onBlur={e => updateField(jl.jacket_line_id, 'actual_cases_loaded', Number(e.target.value))} style={{ width: 64 }} /></td>
              <td><input type="number" defaultValue={jl.actual_cases_delivered} onBlur={e => updateField(jl.jacket_line_id, 'actual_cases_delivered', Number(e.target.value))} style={{ width: 64 }} /></td>
              <td><input type="text" defaultValue={jl.bol_number || ''} onBlur={e => updateField(jl.jacket_line_id, 'bol_number', e.target.value)} style={{ width: 100 }} placeholder="BOL #" /></td>
              <td>
                <select defaultValue={jl.load_status} onBlur={e => updateField(jl.jacket_line_id, 'load_status', e.target.value)} onChange={e => updateField(jl.jacket_line_id, 'load_status', e.target.value)}>
                  {statusOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </td>
              <td><input type="text" defaultValue={jl.exception_notes || ''} onBlur={e => updateField(jl.jacket_line_id, 'exception_notes', e.target.value)} style={{ width: 180 }} placeholder="Delay / exception notes" /></td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <div style={{ marginTop: 24, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#C0562D' }}>⚠ Claims &amp; Quality Issues</div>
            <div style={{ fontSize: 12, color: '#a8a29e' }}>Operational record only — flag it, then AP/AR issues the actual credit memo in Acumatica.</div>
          </div>
          <button onClick={() => setShowClaimForm(!showClaimForm)} style={{ padding: '6px 14px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>+ Log Claim</button>
        </div>
        {showClaimForm && (
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <label style={{ fontSize: 13 }}>Jacket Line
              <select value={claimForm.jacket_line_id} onChange={e => setClaimForm({ ...claimForm, jacket_line_id: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                <option value="">— select —</option>
                {lines.map(jl => <option key={jl.jacket_line_id} value={jl.jacket_line_id}>{jl.jackets?.jacket_number} — {jl.order_lines?.products?.commodity}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>Type
              <select value={claimForm.claim_type} onChange={e => setClaimForm({ ...claimForm, claim_type: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }}>
                <option>Quality</option><option>Shortage</option><option>Temperature</option><option>Damage</option><option>Delay</option>
              </select>
            </label>
            <label style={{ fontSize: 13, gridColumn: 'span 3' }}>Description
              <input value={claimForm.description} onChange={e => setClaimForm({ ...claimForm, description: e.target.value })} style={{ display: 'block', width: '100%', padding: '6px 8px', marginTop: 4 }} />
            </label>
            <button onClick={saveClaim} style={{ padding: '8px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', gridColumn: 'span 1' }}>Save Claim</button>
          </div>
        )}
        {claims.length > 0 && (
          <table style={{ ...table, marginTop: 16 }}>
            <thead><tr style={trHead}><th>Type</th><th>Description</th><th>Commodity</th><th>Opened</th><th>Status</th></tr></thead>
            <tbody>{claims.map(c => (
              <tr key={c.claim_id} style={tr}>
                <td>{c.claim_type}</td><td>{c.description}</td>
                <td>{c.jacket_lines?.order_lines?.products?.commodity}</td>
                <td style={{ color: '#a8a29e', fontSize: 12 }}>{c.date_opened}</td><td>{c.status}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}

const table = { width: '100%', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
