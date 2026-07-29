// pages/admin/requests.js
// Staff-only. Shows pending order requests submitted through the customer
// portal, and converts an approved one into a real Customer Order in one
// click — pulling in whatever pricing/availability staff confirms.
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function RequestQueue() {
  const [requests, setRequests] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from('order_requests')
      .select('*, customers(company), order_request_lines(*, products(commodity, pack_size))')
      .eq('status', 'Pending')
      .order('requested_at', { ascending: true });
    setRequests(data || []);
  }

  async function approve(req) {
    // Staff still sets the real Acumatica order number, supplier, and
    // final price per line before this becomes a firm order — this button
    // just creates the shell so nothing has to be re-typed.
    const acumaticaNo = prompt('Acumatica Order #:');
    if (!acumaticaNo) return;

    const { data: order } = await supabase.from('customer_orders').insert({
      acumatica_order_no: acumaticaNo,
      customer_id: req.customer_id,
      order_date: new Date().toISOString().slice(0, 10),
      source: 'Portal Request',
      status: 'Open'
    }).select().single();

    await supabase.from('order_requests').update({
      status: 'Approved', converted_order_id: order.customer_order_id, reviewed_at: new Date().toISOString()
    }).eq('request_id', req.request_id);

    alert('Order ' + acumaticaNo + ' created. Go add supplier + pricing on each line in Customer Orders.');
    load();
  }

  async function reject(req) {
    if (!confirm('Reject this request? The customer will need to be told separately.')) return;
    await supabase.from('order_requests').update({ status: 'Rejected', reviewed_at: new Date().toISOString() }).eq('request_id', req.request_id);
    load();
  }

  return (
    <div style={{ padding: 32, fontFamily: 'sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ color: '#2F5233' }}>Pending Order Requests</h1>
      {requests.length === 0 && <p style={{ color: '#a8a29e' }}>Nothing waiting on review.</p>}
      {requests.map(r => (
        <div key={r.request_id} style={{ background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{r.customers.company}</strong>
            <span style={{ color: '#78716c', fontSize: 12 }}>{new Date(r.requested_at).toLocaleString()}</span>
          </div>
          <ul style={{ fontSize: 14 }}>
            {r.order_request_lines.map(l => (
              <li key={l.request_line_id}>{l.products.commodity} — {l.products.pack_size}: {l.cases_requested} cases</li>
            ))}
          </ul>
          <button onClick={() => approve(r)} style={{ marginRight: 8, padding: '6px 14px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Approve → Create Order</button>
          <button onClick={() => reject(r)} style={{ padding: '6px 14px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' }}>Reject</button>
        </div>
      ))}
    </div>
  );
}
