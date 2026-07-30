// pages/app/ordering-needs.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function OrderingNeedsPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: lines } = await supabase
      .from('order_lines')
      .select('cases_ordered, product_id, products(commodity, pack_size), customer_orders(order_status, acumatica_order_no, customers(company))')
      .eq('customer_orders.order_status', 'Open');

    const { data: jacketLines } = await supabase.from('jacket_lines').select('order_line_id, cases_to_load, jackets(jacket_status)');

    // "still needed" = cases ordered minus what's already been assigned to a non-cancelled jacket
    const byOrderLine = {};
    (jacketLines || []).forEach(jl => {
      if (jl.jackets?.jacket_status === 'Cancelled') return;
      byOrderLine[jl.order_line_id] = (byOrderLine[jl.order_line_id] || 0) + Number(jl.cases_to_load || 0);
    });

    const groups = {};
    (lines || []).forEach(l => {
      if (!l.customer_orders || l.customer_orders.order_status !== 'Open') return;
      const key = l.product_id;
      if (!groups[key]) groups[key] = { commodity: l.products?.commodity, packSize: l.products?.pack_size, needed: 0, orders: [] };
      const assigned = byOrderLine[l.order_line_id] || 0;
      const remaining = Number(l.cases_ordered || 0) - assigned;
      if (remaining > 0) {
        groups[key].needed += remaining;
        groups[key].orders.push(`${l.customer_orders.acumatica_order_no} (${l.customer_orders.customers?.company}, ${remaining} cs)`);
      }
    });

    setRows(Object.values(groups).filter(g => g.needed > 0).sort((a, b) => b.needed - a.needed));
  }

  return (
    <AppShell title="Ordering Needs">
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 16 }}>What's still owed to customers but not yet assigned to a truck — this is what you need to line up from your suppliers.</div>
      {rows.length === 0 ? (
        <p style={{ color: '#a8a29e' }}>Nothing outstanding — every open order line is already assigned to a jacket.</p>
      ) : (
        <table style={table}>
          <thead><tr style={trHead}><th>Commodity</th><th style={{ textAlign: 'right' }}>Total Cases Needed</th><th>From Which Orders</th></tr></thead>
          <tbody>{rows.map((g, i) => (
            <tr key={i} style={tr}>
              <td>{g.commodity} — {g.packSize}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#2F5233' }}>{g.needed}</td>
              <td style={{ fontSize: 12, color: '#78716c' }}>{g.orders.join('; ')}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </AppShell>
  );
}

const table = { width: '100%', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
