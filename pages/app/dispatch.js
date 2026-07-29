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

  if (!jacket) return <AppShell title="Dispatch Ticket"><p style={{ color: '#a8a29e' }}>No jackets yet — create one on the Jackets page first.</p></AppShell>;

  const pickups = stops.filter(s => s.stop_type === 'Pickup');
  const deliveries = stops.filter(s => s.stop_type === 'Delivery');

  const bySupplier = {};
  pickups.forEach(s => (s.stop_lines || []).forEach(sl => {
    const name = s.suppliers?.company || '—';
    bySupplier[name] = (bySupplier[name] || 0) + Number(sl.cases_at_stop || 0);
  }));

  return (
    <AppShell title="Dispatch Ticket">
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
        <table style={table}>
          <thead><tr style={trHead}><th>#</th><th>Supplier</th><th>Shipper PO</th><th>Address</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right' }}>Pallets</th></tr></thead>
          <tbody>{pickups.map(s => (s.stop_lines || []).map(sl => (
            <tr key={sl.stop_line_id} style={tr}>
              <td>{s.stop_number}</td><td>{s.suppliers?.company}</td><td>{sl.jacket_lines?.order_lines?.shipper_po}</td>
              <td>{s.suppliers?.pickup_address}, {s.suppliers?.city} {s.suppliers?.state}</td>
              <td>{sl.jacket_lines?.order_lines?.products?.commodity} — {sl.jacket_lines?.order_lines?.products?.pack_size}</td>
              <td style={{ textAlign: 'right' }}>{sl.cases_at_stop}</td><td style={{ textAlign: 'right' }}>{sl.pallets_at_stop}</td>
            </tr>
          )))}</tbody>
        </table>

        <div style={{ fontWeight: 600, color: '#6B8E4E', margin: '20px 0 8px' }}>Deliveries</div>
        <table style={table}>
          <thead><tr style={trHead}><th>#</th><th>Customer</th><th>Address</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right' }}>Pallets</th></tr></thead>
          <tbody>{deliveries.map(s => (s.stop_lines || []).map(sl => (
            <tr key={sl.stop_line_id} style={tr}>
              <td>{s.stop_number}</td><td>{s.customers?.company}</td>
              <td>{s.customers?.delivery_address}, {s.customers?.city} {s.customers?.state}</td>
              <td>{sl.jacket_lines?.order_lines?.products?.commodity} — {sl.jacket_lines?.order_lines?.products?.pack_size}</td>
              <td style={{ textAlign: 'right' }}>{sl.cases_at_stop}</td><td style={{ textAlign: 'right' }}>{sl.pallets_at_stop}</td>
            </tr>
          )))}</tbody>
        </table>

        <div style={{ fontWeight: 600, color: '#6B8E4E', margin: '20px 0 8px' }}>Total Cases by Supplier</div>
        <table style={{ ...table, maxWidth: 320 }}>
          <thead><tr style={trHead}><th>Supplier</th><th style={{ textAlign: 'right' }}>Cases</th></tr></thead>
          <tbody>{Object.entries(bySupplier).map(([name, cases]) => (
            <tr key={name} style={tr}><td>{name}</td><td style={{ textAlign: 'right' }}>{cases}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <style jsx>{`@media print { .no-print { display: none; } }`}</style>
    </AppShell>
  );
}

const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
