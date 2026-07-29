// pages/app/orders.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK_ORDER = { acumatica_order_no: '', customer_id: '', customer_po: '', order_date: '', requested_delivery: '', salesperson: '', order_status: 'Open' };
const BLANK_LINE = { supplier_id: '', product_id: '', shipper_po: '', cases_ordered: '', sell_price_per_case: '', fob_cost_per_case: '', pricing_type: 'FOB' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [openOrderId, setOpenOrderId] = useState(null);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState(BLANK_ORDER);

  const [lineTarget, setLineTarget] = useState(null); // { orderId, lineId|null }
  const [lineForm, setLineForm] = useState(BLANK_LINE);

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

  // ---- order header: create + edit ----
  function openNewOrder() { setOrderForm(BLANK_ORDER); setEditingOrderId(null); setShowNewOrder(true); }
  function openEditOrder(o) {
    setOrderForm({ acumatica_order_no: o.acumatica_order_no, customer_id: o.customer_id, customer_po: o.customer_po || '', order_date: o.order_date || '', requested_delivery: o.requested_delivery || '', salesperson: o.salesperson || '', order_status: o.order_status });
    setEditingOrderId(o.customer_order_id);
    setShowNewOrder(true);
  }
  async function saveOrder() {
    if (!orderForm.acumatica_order_no || !orderForm.customer_id) { alert('Acumatica Order # and Customer are both required.'); return; }
    const payload = {
      acumatica_order_no: orderForm.acumatica_order_no,
      customer_id: Number(orderForm.customer_id),
      customer_po: orderForm.customer_po || null,
      order_date: orderForm.order_date || null,
      requested_delivery: orderForm.requested_delivery || null,
      salesperson: orderForm.salesperson || null,
      order_status: orderForm.order_status || 'Open',
    };
    if (editingOrderId) {
      const { error } = await supabase.from('customer_orders').update(payload).eq('customer_order_id', editingOrderId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('customer_orders').insert({ ...payload, source: 'Internal' });
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setShowNewOrder(false); setEditingOrderId(null); setOrderForm(BLANK_ORDER);
    loadAll();
  }

  // ---- order line: create + edit ----
  function openAddLine(orderId) { setLineForm(BLANK_LINE); setLineTarget({ orderId, lineId: null }); }
  function openEditLine(orderId, l) {
    setLineForm({ supplier_id: l.supplier_id, product_id: l.product_id, shipper_po: l.shipper_po || '', cases_ordered: l.cases_ordered, sell_price_per_case: l.sell_price_per_case, fob_cost_per_case: l.fob_cost_per_case, pricing_type: l.pricing_type || 'FOB' });
    setLineTarget({ orderId, lineId: l.order_line_id });
  }
  async function saveLine() {
    if (!lineForm.supplier_id || !lineForm.product_id || !lineForm.cases_ordered) { alert('Supplier, Product, and Cases Ordered are required.'); return; }
    const payload = {
      supplier_id: Number(lineForm.supplier_id),
      product_id: Number(lineForm.product_id),
      shipper_po: lineForm.shipper_po || null,
      cases_ordered: Number(lineForm.cases_ordered),
      sell_price_per_case: lineForm.sell_price_per_case ? Number(lineForm.sell_price_per_case) : null,
      fob_cost_per_case: lineForm.fob_cost_per_case ? Number(lineForm.fob_cost_per_case) : null,
      pricing_type: lineForm.pricing_type,
    };
    if (lineTarget.lineId) {
      const { error } = await supabase.from('order_lines').update(payload).eq('order_line_id', lineTarget.lineId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const { error } = await supabase.from('order_lines').insert({ ...payload, customer_order_id: lineTarget.orderId, line_status: 'Open' });
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setLineTarget(null); setLineForm(BLANK_LINE);
    loadAll();
  }

  async function updateLineField(lineId, field, value) {
    const { error } = await supabase.from('order_lines').update({ [field]: value }).eq('order_line_id', lineId);
    if (error) { alert('Update failed: ' + error.message); return; }
    loadAll();
  }

  return (
    <AppShell title="Customer Orders">
      <button onClick={openNewOrder} style={btn}>+ New Order</button>
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
            <label style={{ fontSize: 13 }}>Status
              <select value={orderForm.order_status} onChange={e => setOrderForm({ ...orderForm, order_status: e.target.value })} style={input}>
                <option>Open</option><option>Closed</option><option>Cancelled</option>
              </select>
            </label>
          </div>
          <button onClick={saveOrder} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{editingOrderId ? 'Update Order' : 'Save Order'}</button>
          <button onClick={() => { setShowNewOrder(false); setEditingOrderId(null); }} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}

      {orders.map(o => {
        const isOpen = openOrderId === o.customer_order_id;
        return (
          <div key={o.customer_order_id} style={card}>
            <div style={btnRow}>
              <button onClick={() => setOpenOrderId(isOpen ? null : o.customer_order_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, flex: 1, textAlign: 'left' }}>
                <span>{isOpen ? '⌄' : '›'} <strong style={{ fontFamily: 'monospace' }}>{o.acumatica_order_no}</strong> {o.customers?.company} <span style={{ color: '#78716c', fontSize: 12 }}>PO {o.customer_po}</span></span>
              </button>
              <span style={pill(o.order_status)}>{o.order_status}</span>
              <button onClick={() => openEditOrder(o)} style={{ ...editBtn, marginLeft: 8 }}>Edit Order</button>
            </div>
            {isOpen && (
              <div style={{ marginTop: 12 }}>
                <table style={table}>
                  <thead><tr style={trHead}><th>Commodity</th><th>Supplier</th><th>Shipper PO</th><th style={{ textAlign: 'right' }}>Cases</th><th>Sell $/cs</th><th>Cost $/cs</th><th>Revenue</th><th>Margin</th><th></th></tr></thead>
                  <tbody>{(o.order_lines || []).map(l => {
                    const revenue = l.cases_ordered * l.sell_price_per_case;
                    const margin = revenue - (l.cases_ordered * l.fob_cost_per_case);
                    return (
                      <tr key={l.order_line_id} style={tr}>
                        <td>{l.products?.commodity} — {l.products?.pack_size}</td>
                        <td>{l.suppliers?.company}</td>
                        <td>{l.shipper_po}</td>
                        <td style={{ textAlign: 'right' }}>{l.cases_ordered}</td>
                        <td><input type="number" defaultValue={l.sell_price_per_case} onBlur={e => updateLineField(l.order_line_id, 'sell_price_per_case', Number(e.target.value))} style={{ width: 72 }} /></td>
                        <td><input type="number" defaultValue={l.fob_cost_per_case} onBlur={e => updateLineField(l.order_line_id, 'fob_cost_per_case', Number(e.target.value))} style={{ width: 72 }} /></td>
                        <td>${revenue.toLocaleString()}</td>
                        <td style={{ color: margin >= 0 ? '#2F5233' : '#C0562D', fontWeight: 700 }}>${margin.toLocaleString()}</td>
                        <td><button onClick={() => openEditLine(o.customer_order_id, l)} style={editBtn}>Edit</button></td>
                      </tr>
                    );
                  })}</tbody>
                </table>

                {lineTarget && lineTarget.orderId === o.customer_order_id ? (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #DCD5C1' }}>
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
                      <label style={{ fontSize: 13 }}>Pricing Type
                        <select value={lineForm.pricing_type} onChange={e => setLineForm({ ...lineForm, pricing_type: e.target.value })} style={input}>
                          <option>FOB</option><option>Delivered</option>
                        </select>
                      </label>
                    </div>
                    <button onClick={saveLine} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{lineTarget.lineId ? 'Update Line' : 'Save Line'}</button>
                    <button onClick={() => setLineTarget(null)} style={{ ...btn, background: '#fff', color: '#333', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => openAddLine(o.customer_order_id)} style={{ background: 'none', border: 'none', color: '#6B8E4E', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 8, padding: '4px 0' }}>+ Add Order Line</button>
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
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}
function pill(status) {
  const colors = { Open: '#6B8E4E', Closed: '#6B7280', Cancelled: '#B0403A' };
  return { display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color: '#fff', background: colors[status] || '#9CA3AF' };
}
const btn = { padding: '8px 16px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' };
const btnRow = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const card = { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, padding: 16, marginBottom: 12 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 };
const input = { display: 'block', width: '100%', padding: '6px 8px', marginTop: 4, border: '1px solid #DCD5C1', borderRadius: 4, fontSize: 13 };
const table = { width: '100%', background: '#fff', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
