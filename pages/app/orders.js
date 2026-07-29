// pages/app/orders.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [openOrderId, setOpenOrderId] = useState(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [addLineForOrder, setAddLineForOrder] = useState(null);

  const [orderForm, setOrderForm] = useState({ acumatica_order_no: '', customer_id: '', customer_po: '', order_date: '', requested_delivery: '', salesperson: '' });
  const [lineForm, setLineForm] = useState({ supplier_id: '', product_id: '', shipper_po: '', cases_ordered: '', sell_price_per_case: '', fob_cost_per_case: '', pricing_type: 'FOB' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [o, c, s, p] = await Promise.all([
      supabase.from('customer_orders').select('*, customers(company), order_lines(*, suppliers(company), products(commodity, pack_size))').order('order_date', { ascending: false }),
      supabase.from('customers').select('customer_id, company').order('company'),
      supabase.from('suppliers').select('supplier_id, company').order('company'),
      supabase.from('products').select('product_id, commodity, pack_size').order('commodity'),
    ]);
    setOrders(o.data || []);
    setCustomers(c.data || []);
    setSuppliers(s.data || []);
    setProducts(p.data || []);
  }

  async function saveOrder() {
    if (!orderForm.acumatica_order_no || !orderForm.customer_id) {
      alert('Acumatica Order # and Customer are both required.');
      return;
    }
    const payload = {
      acumatica_order_no: orderForm.acumatica_order_no,
      customer_id: Number(orderForm.customer_id),
      customer_po: orderForm.customer_po || null,
      order_date: orderForm.order_date || null,
      requested_delivery: orderForm.requested_delivery || null,
      salesperson: orderForm.salesperson || null,
      order_status: 'Open',
      source: 'Internal'
    };
    const { error } = await supabase.from('customer_orders').insert(payload);
    if (error) { alert('Save failed: ' + error.message); return; }
    setOrderForm({ acumatica_order_no: '', customer_id: '', customer_po: '', order_date: '', requested_delivery: '', salesperson: '' });
    setShowNewOrder(false);
    loadAll();
  }

  async function saveLine(orderId) {
    if (!lineForm.supplier_id || !lineForm.product_id || !lineForm.cases_ordered) {
      alert('Supplier, Product, and Cases Ordered are required.');
      return;
    }
    const payload = {
      customer_order_id: orderId,
      supplier_id: Number(lineForm.supplier_id),
      product_id: Number(lineForm.product_id),
      shipper_po: lineForm.shipper_po || null,
      cases_ordered: Number(lineForm.cases_ordered),
      sell_price_per_case: lineForm.sell_price_per_case ? Number(lineForm.sell_price_per_case) : null,
      fob_cost_per_case: lineForm.fob_cost_per_case ? Number(lineForm.fob_cost_per_case) : null,
      pricing_type: lineForm.pricing_type,
      line_status: 'Open'
    };
    const { error } = await supabase.from('order_lines').insert(payload);
    if (error) { alert('Save failed: ' + error.message); return; }
    setLineForm({ supplier_id: '', product_id: '', shipper_po: '', cases_ordered: '', sell_price_per_case: '', fob_cost_per_case: '', pricing_type: 'FOB' });
    setAddLineForOrder(null);
    loadAll();
  }

  async function updateLineField(lineId, field, value) {
    const { error } = await supabase.from('order_lines').update({ [field]: value }).eq('order_line_id', lineId);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadAll();
  }

  return (
    <AppShell title="Customer Orders">
      <button onClick={() => setShowNewOrder(!showNewOrder)} style={btn}>+ New Order</button>
      {showNewOrder && (
        <div style={card}>
          <div style={grid}>
            {field('Acumatica Order #', orderForm.acumatica_order_no, v => setOrderForm({ ...orderForm, acumatica_order_no: v }))}
            <label style={{ fontSize: 13 }}>Customer
              <select value={orderForm.customer_id} onChange={e => setOrderForm({ ...orderForm, customer_id: e.target.value })} style={input}>
                <option value="">— select —</option>
                {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.company}</option>)}
              </select>
            </label>
            {field('Customer PO', orderForm.customer_po, v => setOrderForm({ ...orderForm, customer_po: v }))}
            {field('Order Date', orderForm.order_date, v => setOrderForm({ ...orderForm, order_date: v }), 'date')}
            {field('Requested Delivery', orderForm.requested_delivery, v => setOrderForm({ ...orderForm, requested_delivery: v }), 'date')}
            {field('Salesperson', orderForm.salesperson, v => setOrderForm({ ...orderForm, salesperson: v }))}
          </div>
          <button onClick={saveOrder} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>Save Order</button>
        </div>
      )}

      {orders.map(o => {
        const isOpen = openOrderId === o.customer_order_id;
        return (
          <div key={o.customer_order_id} style={card}>
            <button onClick={() => setOpenOrderId(isOpen ? null : o.customer_order_id)} style={{ ...btnRow, marginBottom: isOpen ? 12 : 0 }}>
              <span>{isOpen ? '⌄' : '›'} <strong style={{ fontFamily: 'monospace' }}>{o.acumatica_order_no}</strong> {o.customers?.company} <span style={{ color: '#78716c', fontSize: 12 }}>PO {o.customer_po}</span></span>
              <span style={pill(o.order_status)}>{o.order_status}</span>
            </button>
            {isOpen && (
              <div>
                <table style={table}>
                  <thead><tr style={trHead}><th>Commodity</th><th>Supplier</th><th className="right">Cases</th><th>Sell $/cs</th><th>Cost $/cs</th><th>Revenue</th><th>Margin</th></tr></thead>
                  <tbody>{(o.order_lines || []).map(l => {
                    const revenue = l.cases_ordered * l.sell_price_per_case;
                    const margin = revenue - (l.cases_ordered * l.fob_cost_per_case);
                    return (
                      <tr key={l.order_line_id} style={tr}>
                        <td>{l.products?.commodity} — {l.products?.pack_size}</td>
                        <td>{l.suppliers?.company}</td>
                        <td>{l.cases_ordered}</td>
                        <td><input type="number" defaultValue={l.sell_price_per_case} onBlur={e => updateLineField(l.order_line_id, 'sell_price_per_case', Number(e.target.value))} style={{ width: 72 }} /></td>
                        <td><input type="number" defaultValue={l.fob_cost_per_case} onBlur={e => updateLineField(l.order_line_id, 'fob_cost_per_case', Number(e.target.value))} style={{ width: 72 }} /></td>
                        <td>${revenue.toLocaleString()}</td>
                        <td style={{ color: margin >= 0 ? '#2F5233' : '#C0562D', fontWeight: 700 }}>${margin.toLocaleString()}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
                <button onClick={() => setAddLineForOrder(addLineForOrder === o.customer_order_id ? null : o.customer_order_id)}
                  style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 8, padding: '4px 0' }}>
                  + Add Order Line
                </button>
                {addLineForOrder === o.customer_order_id && (
                  <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid #DCD5C1' }}>
                    <div style={grid}>
                      <label style={{ fontSize: 13 }}>Supplier
                        <select value={lineForm.supplier_id} onChange={e => setLineForm({ ...lineForm, supplier_id: e.target.value })} style={input}>
                          <option value="">— select —</option>
                          {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
                        </select>
                      </label>
                      <label style={{ fontSize: 13 }}>Product
                        <select value={lineForm.product_id} onChange={e => setLineForm({ ...lineForm, product_id: e.target.value })} style={input}>
                          <option value="">— select —</option>
                          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
                        </select>
                      </label>
                      {field('Shipper PO', lineForm.shipper_po, v => setLineForm({ ...lineForm, shipper_po: v }))}
                      {field('Cases Ordered', lineForm.cases_ordered, v => setLineForm({ ...lineForm, cases_ordered: v }), 'number')}
                      {field('Sell Price / cs', lineForm.sell_price_per_case, v => setLineForm({ ...lineForm, sell_price_per_case: v }), 'number')}
                      {field('FOB Cost / cs', lineForm.fob_cost_per_case, v => setLineForm({ ...lineForm, fob_cost_per_case: v }), 'number')}
                    </div>
                    <button onClick={() => saveLine(o.customer_order_id)} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>Save Line</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </AppShell>
  );
}

function field(label, value, onChange, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>{label}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}
function pill(status) {
  const colors = { Open: '#6B8E4E', Closed: '#6B7280', Cancelled: '#B0403A' };
  return { display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#fff', background: colors[status] || '#9CA3AF' };
}
const btn = { padding: '8px 16px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 16 };
const btnRow = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16, marginBottom: 12 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
const input = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
const table = { width: '100%', background: '#fff', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
