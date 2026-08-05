// pages/app/dispatch.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const TRIP_TYPES = ['One Pick/One Drop', 'Multi Pick/One Drop', 'One Pick/Multi Drop', 'Multi Pick/Multi Drop'];

export default function DispatchPage() {
  const [jackets, setJackets] = useState([]);
  const [jacketId, setJacketId] = useState(null);
  const [jacket, setJacket] = useState(null);
  const [stops, setStops] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [loadedCases, setLoadedCases] = useState(0);

  const [freight, setFreight] = useState(null);
  const [editingFreight, setEditingFreight] = useState(false);
  const [freightForm, setFreightForm] = useState({});

  useEffect(() => { loadJackets(); loadCarriers(); }, []);
  useEffect(() => { if (jacketId) loadDetail(jacketId); }, [jacketId]);

  async function loadJackets() {
    const { data } = await supabase.from('jackets').select('*').order('jacket_number');
    setJackets(data || []);
    if (data && data.length && !jacketId) setJacketId(data[0].jacket_id);
  }
  async function loadCarriers() {
    const { data } = await supabase.from('carriers').select('carrier_id, name').order('name');
    setCarriers(data || []);
  }

  async function loadDetail(id) {
    const { data: j } = await supabase.from('jackets').select('*').eq('jacket_id', id).single();
    setJacket(j);
    const { data: stopRows } = await supabase
      .from('stops')
      .select('*, suppliers(company, pickup_address, city, state, phone), customers(company, delivery_address, city, state, phone), supplier_locations(label, address, city, state, phone, contact), customer_locations(label, address, city, state, phone, contact), stop_lines(*, jacket_lines(*, order_lines(shipper_po, products(commodity, pack_size)), customer_notifications(notification_type, notified_at)))')
      .eq('jacket_id', id)
      .order('stop_number');
    setStops(stopRows || []);

    const { data: jcl } = await supabase.from('jacket_commodity_loads').select('actual_cases_loaded').eq('jacket_id', id);
    setLoadedCases((jcl || []).reduce((s, l) => s + Number(l.actual_cases_loaded || 0), 0));

    const { data: f } = await supabase.from('freight_records').select('*').eq('jacket_id', id).order('quote_date', { ascending: false }).limit(1).maybeSingle();
    setFreight(f || null);
  }

  async function updateStopNumber(stopId, newNumber) {
    const { error } = await supabase.from('stops').update({ stop_number: Number(newNumber) }).eq('stop_id', stopId);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadDetail(jacketId);
  }
  async function updateAppointment(stopId, value) {
    const { error } = await supabase.from('stops').update({ appointment: value ? new Date(value).toISOString() : null }).eq('stop_id', stopId);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadDetail(jacketId);
  }
  function toLocalInputValue(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function openFreightEdit() {
    setFreightForm(freight || { carrier: jacket?.carrier || '', trip_type: TRIP_TYPES[0], quoted_rate: '', booked_rate: '', extra_fees: '', extra_fees_notes: '', miles: '', status: 'Quoted', carrier_invoice_number: '', invoice_received: false, carrier_paid: false });
    setEditingFreight(true);
  }
  async function saveFreight() {
    if (!freightForm.carrier) { alert('Carrier is required.'); return; }
    const payload = {
      jacket_id: jacketId,
      carrier: freightForm.carrier,
      trip_type: freightForm.trip_type,
      quoted_rate: freightForm.quoted_rate ? Number(freightForm.quoted_rate) : null,
      booked_rate: freightForm.booked_rate ? Number(freightForm.booked_rate) : null,
      extra_fees: freightForm.extra_fees ? Number(freightForm.extra_fees) : 0,
      extra_fees_notes: freightForm.extra_fees_notes || null,
      miles: freightForm.miles ? Number(freightForm.miles) : null,
      status: freightForm.status,
      carrier_invoice_number: freightForm.carrier_invoice_number || null,
      invoice_received: !!freightForm.invoice_received,
      carrier_paid: !!freightForm.carrier_paid,
    };
    if (freight) {
      const { error } = await supabase.from('freight_records').update(payload).eq('freight_id', freight.freight_id);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('freight_records').insert({ ...payload, quote_date: new Date().toISOString().slice(0, 10) });
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setEditingFreight(false);
    loadDetail(jacketId);
  }

  if (!jacket) return <AppShell title="Dispatch &amp; Freight"><p style={{ color: 'var(--fo-text-faint)' }}>No jackets yet — create one on the Jackets page first.</p></AppShell>;

  const pickups = stops.filter(s => s.stop_type === 'Pickup');
  const deliveries = stops.filter(s => s.stop_type === 'Delivery');
  const bySupplier = {};
  pickups.forEach(s => (s.stop_lines || []).forEach(sl => {
    const name = s.suppliers?.company || '—';
    bySupplier[name] = (bySupplier[name] || 0) + Number(sl.cases_at_stop || 0);
  }));
  const byCustomer = {};
  deliveries.forEach(s => (s.stop_lines || []).forEach(sl => {
    const name = s.customers?.company || '—';
    byCustomer[name] = (byCustomer[name] || 0) + Number(sl.cases_at_stop || 0);
  }));

  const totalCost = freight ? Number(freight.booked_rate || 0) + Number(freight.extra_fees || 0) : 0;
  const perMile = freight?.miles ? (Number(freight.booked_rate || 0) / freight.miles).toFixed(2) : null;
  const perCase = loadedCases > 0 && totalCost ? (totalCost / loadedCases).toFixed(2) : null;

  return (
    <AppShell title="Dispatch & Freight">
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select value={jacketId || ''} onChange={e => setJacketId(Number(e.target.value))} style={{ padding: '6px 10px', border: '1px solid var(--fo-border)', borderRadius: 6 }}>
          {jackets.map(j => <option key={j.jacket_id} value={j.jacket_id}>{j.jacket_number}</option>)}
        </select>
        <button onClick={() => window.print()} style={{ padding: '6px 16px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>🖨 Print / Export for Carrier</button>
      </div>

      {/* ---- Freight panel ---- */}
      <div style={{ background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingFreight ? 12 : 0 }}>
          <strong style={{ color: 'var(--fo-primary)' }}>Freight</strong>
          {!editingFreight && <button className="no-print" onClick={openFreightEdit} style={{ padding: '6px 14px', background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>{freight ? 'Edit' : '+ Add Freight Record'}</button>}
        </div>

        {editingFreight ? (
          <div className="no-print">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <label style={{ fontSize: 13 }}>Carrier
                <select value={freightForm.carrier} onChange={e => setFreightForm({ ...freightForm, carrier: e.target.value })} style={input}>
                  <option value="">— select —</option>
                  {carriers.map(c => <option key={c.carrier_id} value={c.name}>{c.name}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13 }}>Trip Type
                <select value={freightForm.trip_type} onChange={e => setFreightForm({ ...freightForm, trip_type: e.target.value })} style={input}>
                  {TRIP_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              {ffield('Quoted Rate ($)', freightForm.quoted_rate, v => setFreightForm({ ...freightForm, quoted_rate: v }), 'number')}
              {ffield('Booked Rate ($)', freightForm.booked_rate, v => setFreightForm({ ...freightForm, booked_rate: v }), 'number')}
              {ffield('Extra Fees ($) — lumper, extra drop, etc.', freightForm.extra_fees, v => setFreightForm({ ...freightForm, extra_fees: v }), 'number')}
              {ffield('Extra Fees Notes', freightForm.extra_fees_notes, v => setFreightForm({ ...freightForm, extra_fees_notes: v }))}
              {ffield('Miles', freightForm.miles, v => setFreightForm({ ...freightForm, miles: v }), 'number')}
              <label style={{ fontSize: 13 }}>Status
                <select value={freightForm.status} onChange={e => setFreightForm({ ...freightForm, status: e.target.value })} style={input}>
                  <option>Quoted</option><option>Booked</option>
                </select>
              </label>
              {ffield('Carrier Invoice #', freightForm.carrier_invoice_number, v => setFreightForm({ ...freightForm, carrier_invoice_number: v }))}
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
                <input type="checkbox" checked={!!freightForm.invoice_received} onChange={e => setFreightForm({ ...freightForm, invoice_received: e.target.checked })} /> Invoice Received
              </label>
              <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
                <input type="checkbox" checked={!!freightForm.carrier_paid} onChange={e => setFreightForm({ ...freightForm, carrier_paid: e.target.checked })} /> Carrier Paid
              </label>
            </div>
            <button onClick={saveFreight} style={{ marginTop: 12, marginRight: 8, padding: '8px 16px', background: 'var(--fo-accent)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setEditingFreight(false)} style={{ marginTop: 12, padding: '8px 16px', background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : freight ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, fontSize: 13 }}>
            <div><div style={label}>Carrier</div>{freight.carrier}</div>
            <div><div style={label}>Trip Type</div>{freight.trip_type}</div>
            <div><div style={label}>Miles</div>{freight.miles || '—'}</div>
            <div><div style={label}>Booked Rate</div>${Number(freight.booked_rate || 0).toLocaleString()}</div>
            <div><div style={label}>Extra Fees</div>{freight.extra_fees ? `$${Number(freight.extra_fees).toLocaleString()}` : '—'}</div>
            <div><div style={label}>Total Cost</div><strong>${totalCost.toLocaleString()}</strong></div>
            <div><div style={label}>$/Mile</div>{perMile ? `$${perMile}` : '—'}</div>
            <div><div style={label}>Loaded Cases</div>{loadedCases}</div>
            <div><div style={label}>$/Case</div>{perCase ? `$${perCase}` : '—'}</div>
            <div><div style={label}>Status</div>{freight.status}</div>
            <div><div style={label}>Invoice</div>{freight.invoice_received ? 'Received' : 'Pending'}</div>
            <div><div style={label}>Paid</div>{freight.carrier_paid ? 'Yes' : 'No'}</div>
          </div>
        ) : (
          <p style={{ color: 'var(--fo-text-faint)', fontSize: 13, marginTop: 8 }}>No freight record yet for this jacket.</p>
        )}
      </div>

      {/* ---- Printable carrier sheet ---- */}
      <div style={{ background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 8, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--fo-border)', paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--fo-primary)' }}>Jacket {jacket.jacket_number}</div>
            <div style={{ color: 'var(--fo-text-dim)' }}>{jacket.jacket_date} · {jacket.route}</div>
          </div>
          <div style={{ fontSize: 13, textAlign: 'right' }}>
            <div><span style={{ color: 'var(--fo-text-dim)' }}>Carrier:</span> {jacket.carrier}</div>
            <div><span style={{ color: 'var(--fo-text-dim)' }}>Driver:</span> {jacket.driver} ({jacket.driver_phone})</div>
            <div><span style={{ color: 'var(--fo-text-dim)' }}>Truck/Trailer:</span> {jacket.truck} / {jacket.trailer}</div>
          </div>
        </div>

        <div style={{ fontWeight: 600, color: 'var(--fo-accent)', marginBottom: 8 }}>Pickups</div>
        {pickups.map(s => (
          <div key={s.stop_id} style={{ marginBottom: 16, border: '1px solid var(--fo-border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: 'var(--fo-section-bg)', padding: '8px 12px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Stop # <input type="number" defaultValue={s.stop_number} onBlur={e => updateStopNumber(s.stop_id, e.target.value)} style={{ width: 44 }} /></span>
              <span className="print-only">#{s.stop_number}</span>
              <strong>— {s.suppliers?.company}</strong>
              <span style={{ color: 'var(--fo-text-dim)' }}>{s.supplier_locations ? `${s.supplier_locations.label} — ${s.supplier_locations.address}, ${s.supplier_locations.city} ${s.supplier_locations.state}` : `${s.suppliers?.pickup_address}, ${s.suppliers?.city} ${s.suppliers?.state}`}</span>
              <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>Appt <input type="datetime-local" defaultValue={toLocalInputValue(s.appointment)} onBlur={e => updateAppointment(s.stop_id, e.target.value)} style={{ fontSize: 12 }} /></span>
              {s.appointment && <span className="print-only" style={{ marginLeft: 'auto', fontWeight: 600 }}>Appt: {new Date(s.appointment).toLocaleString()}</span>}
            </div>
            <table style={table} className="fo-table">
              <thead><tr style={trHead}><th style={{ paddingLeft: 12 }}>Shipper PO</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right', paddingRight: 12 }}>Pallets</th></tr></thead>
              <tbody>{(s.stop_lines || []).map(sl => (
                <tr key={sl.stop_line_id} style={tr}>
                  <td style={{ paddingLeft: 12 }}>{sl.jacket_lines?.order_lines?.shipper_po}</td>
                  <td>{sl.jacket_lines?.order_lines?.products?.commodity} — {sl.jacket_lines?.order_lines?.products?.pack_size}</td>
                  <td style={{ textAlign: 'right' }}>{sl.cases_at_stop}</td>
                  <td style={{ textAlign: 'right', paddingRight: 12 }}>{sl.pallets_at_stop}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}

        <div style={{ fontWeight: 600, color: 'var(--fo-accent)', margin: '20px 0 8px' }}>Deliveries</div>
        {deliveries.map(s => (
          <div key={s.stop_id} style={{ marginBottom: 16, border: '1px solid var(--fo-border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: 'var(--fo-section-bg)', padding: '8px 12px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Stop # <input type="number" defaultValue={s.stop_number} onBlur={e => updateStopNumber(s.stop_id, e.target.value)} style={{ width: 44 }} /></span>
              <span className="print-only">#{s.stop_number}</span>
              <strong>— {s.customers?.company}</strong>
              <span style={{ color: 'var(--fo-text-dim)' }}>{s.customer_locations ? `${s.customer_locations.label} — ${s.customer_locations.address}, ${s.customer_locations.city} ${s.customer_locations.state}` : `${s.customers?.delivery_address}, ${s.customers?.city} ${s.customers?.state}`}</span>
              <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>Appt <input type="datetime-local" defaultValue={toLocalInputValue(s.appointment)} onBlur={e => updateAppointment(s.stop_id, e.target.value)} style={{ fontSize: 12 }} /></span>
              {s.appointment && <span className="print-only" style={{ marginLeft: 'auto', fontWeight: 600 }}>Appt: {new Date(s.appointment).toLocaleString()}</span>}
            </div>
            <table style={table} className="fo-table">
              <thead><tr style={trHead}><th style={{ paddingLeft: 12 }}>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right' }}>Pallets</th><th style={{ paddingRight: 12 }}>Customer Notified</th></tr></thead>
              <tbody>{(s.stop_lines || []).map(sl => (
                <tr key={sl.stop_line_id} style={tr}>
                  <td style={{ paddingLeft: 12 }}>{sl.jacket_lines?.order_lines?.products?.commodity} — {sl.jacket_lines?.order_lines?.products?.pack_size}</td>
                  <td style={{ textAlign: 'right' }}>{sl.cases_at_stop}</td>
                  <td style={{ textAlign: 'right' }}>{sl.pallets_at_stop}</td>
                  <td style={{ paddingRight: 12, fontSize: 11, color: 'var(--fo-text-dim)' }}>
                    {(sl.jacket_lines?.customer_notifications || []).length === 0 ? '—' :
                      sl.jacket_lines.customer_notifications.map((n, i) => (
                        <div key={i}>{n.notification_type} — {new Date(n.notified_at).toLocaleString()}</div>
                      ))
                    }
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 32, marginTop: 20 }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--fo-accent)', marginBottom: 8 }}>Total Cases by Supplier</div>
            <table style={{ ...table, maxWidth: 320 }}>
              <thead><tr style={trHead}><th>Supplier</th><th style={{ textAlign: 'right' }}>Cases</th></tr></thead>
              <tbody>{Object.entries(bySupplier).map(([name, cases]) => (
                <tr key={name} style={tr}><td>{name}</td><td style={{ textAlign: 'right' }}>{cases}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--fo-accent)', marginBottom: 8 }}>Total Cases by Customer — {deliveries.length} delivery stop{deliveries.length === 1 ? '' : 's'}</div>
            <table style={{ ...table, maxWidth: 320 }}>
              <thead><tr style={trHead}><th>Customer</th><th style={{ textAlign: 'right' }}>Cases</th></tr></thead>
              <tbody>{Object.entries(byCustomer).map(([name, cases]) => (
                <tr key={name} style={tr}><td>{name}</td><td style={{ textAlign: 'right' }}>{cases}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ffield(labelText, value, onChange, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>{labelText}
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}

const input = { display: 'block', width: '100%', marginTop: 4 };
const label = { color: 'var(--fo-text-dim)', fontSize: 11 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
