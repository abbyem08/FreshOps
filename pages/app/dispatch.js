// pages/app/dispatch.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function DispatchPage() {
  const [jackets, setJackets] = useState([]);
  const [jacketId, setJacketId] = useState(null);
  const [jacket, setJacket] = useState(null);
  const [stops, setStops] = useState([]);

  useEffect(() => { loadJackets(); }, []);
  useEffect(() => { if (jacketId) loadDetail(jacketId); }, [jacketId]);

  async function loadJackets() {
    const { data } = await supabase.from('jackets').select('*').order('jacket_number');
    setJackets(data || []);
    if (data && data.length && !jacketId) setJacketId(data[0].jacket_id);
  }

  async function loadDetail(id) {
    const { data: j } = await supabase.from('jackets').select('*').eq('jacket_id', id).single();
    setJacket(j);
    const { data: stopRows } = await supabase
      .from('stops')
      .select('*, suppliers(company, pickup_address, city, state, phone), customers(company, delivery_address, city, state, phone), stop_lines(*, jacket_lines(*, order_lines(shipper_po, products(commodity, pack_size))))')
      .eq('jacket_id', id)
      .order('stop_number');
    setStops(stopRows || []);
  }

  async function updateStopNumber(stopId, newNumber) {
    const { error } = await supabase.from('stops').update({ stop_number: Number(newNumber) }).eq('stop_id', stopId);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadDetail(jacketId);
  }

  if (!jacket) return <AppShell title="Dispatch Sheet"><p style={{ color: '#a8a29e' }}>No jackets yet — create one on the Jackets page first.</p></AppShell>;

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

  return (
    <AppShell title="Dispatch Sheet">
      <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select value={jacketId || ''} onChange={e => setJacketId(Number(e.target.value))} style={{ padding: '6px 10px', border: '1px solid #DCD5C1', borderRadius: 6 }}>
          {jackets.map(j => <option key={j.jacket_id} value={j.jacket_id}>{j.jacket_number}</option>)}
        </select>
        <button onClick={() => window.print()} style={{ padding: '6px 16px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>🖨 Print</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #DCD5C1', paddingBottom: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2F5233' }}>Jacket {jacket.jacket_number}</div>
            <div style={{ color: '#78716c' }}>{jacket.jacket_date} · {jacket.route}</div>
          </div>
          <div style={{ fontSize: 13, textAlign: 'right' }}>
            <div><span style={{ color: '#78716c' }}>Carrier:</span> {jacket.carrier}</div>
            <div><span style={{ color: '#78716c' }}>Driver:</span> {jacket.driver} ({jacket.driver_phone})</div>
            <div><span style={{ color: '#78716c' }}>Truck/Trailer:</span> {jacket.truck} / {jacket.trailer}</div>
          </div>
        </div>

        <div style={{ fontWeight: 600, color: '#6B8E4E', marginBottom: 8 }}>Pickups</div>
        {pickups.map(s => (
          <div key={s.stop_id} style={{ marginBottom: 16, border: '1px solid #DCD5C1', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: '#F6F4EC', padding: '8px 12px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Stop # <input type="number" defaultValue={s.stop_number} onBlur={e => updateStopNumber(s.stop_id, e.target.value)} style={{ width: 44 }} /></span>
              <span className="print-only">#{s.stop_number}</span>
              <strong>— {s.suppliers?.company}</strong>
              <span style={{ color: '#78716c' }}>{s.suppliers?.pickup_address}, {s.suppliers?.city} {s.suppliers?.state}</span>
            </div>
            <table style={table}>
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

        <div style={{ fontWeight: 600, color: '#6B8E4E', margin: '20px 0 8px' }}>Deliveries</div>
        {deliveries.map(s => (
          <div key={s.stop_id} style={{ marginBottom: 16, border: '1px solid #DCD5C1', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: '#F6F4EC', padding: '8px 12px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Stop # <input type="number" defaultValue={s.stop_number} onBlur={e => updateStopNumber(s.stop_id, e.target.value)} style={{ width: 44 }} /></span>
              <span className="print-only">#{s.stop_number}</span>
              <strong>— {s.customers?.company}</strong>
              <span style={{ color: '#78716c' }}>{s.customers?.delivery_address}, {s.customers?.city} {s.customers?.state}</span>
            </div>
            <table style={table}>
              <thead><tr style={trHead}><th style={{ paddingLeft: 12 }}>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right', paddingRight: 12 }}>Pallets</th></tr></thead>
              <tbody>{(s.stop_lines || []).map(sl => (
                <tr key={sl.stop_line_id} style={tr}>
                  <td style={{ paddingLeft: 12 }}>{sl.jacket_lines?.order_lines?.products?.commodity} — {sl.jacket_lines?.order_lines?.products?.pack_size}</td>
                  <td style={{ textAlign: 'right' }}>{sl.cases_at_stop}</td>
                  <td style={{ textAlign: 'right', paddingRight: 12 }}>{sl.pallets_at_stop}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 32, marginTop: 20 }}>
          <div>
            <div style={{ fontWeight: 600, color: '#6B8E4E', marginBottom: 8 }}>Total Cases by Supplier</div>
            <table style={{ ...table, maxWidth: 320 }}>
              <thead><tr style={trHead}><th>Supplier</th><th style={{ textAlign: 'right' }}>Cases</th></tr></thead>
              <tbody>{Object.entries(bySupplier).map(([name, cases]) => (
                <tr key={name} style={tr}><td>{name}</td><td style={{ textAlign: 'right' }}>{cases}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#6B8E4E', marginBottom: 8 }}>Total Cases by Customer — {deliveries.length} delivery stop{deliveries.length === 1 ? '' : 's'}</div>
            <table style={{ ...table, maxWidth: 320 }}>
              <thead><tr style={trHead}><th>Customer</th><th style={{ textAlign: 'right' }}>Cases</th></tr></thead>
              <tbody>{Object.entries(byCustomer).map(([name, cases]) => (
                <tr key={name} style={tr}><td>{name}</td><td style={{ textAlign: 'right' }}>{cases}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
      <style jsx>{`
        .print-only { display: none; }
        @media print {
          .no-print { display: none; }
          .print-only { display: inline; }
        }
      `}</style>
    </AppShell>
  );
}

const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
