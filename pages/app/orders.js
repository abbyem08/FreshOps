// pages/app/orders.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK_ORDER = { acumatica_order_no: '', customer_id: '', customer_location_id: '', customer_po: '', order_date: '', requested_delivery: '', salesperson: '', order_status: 'Open' };
const BLANK_LINE = { supplier_id: '', supplier_location_id: '', product_id: '', shipper_po: '', cases_ordered: '', sell_price_per_case: '', fob_cost_per_case: '', pricing_type: 'FOB' };

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('Open');
  const [searchText, setSearchText] = useState('');
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [custLocations, setCustLocations] = useState([]);
  const [supLocations, setSupLocations] = useState([]);
  const [jacketByOrder, setJacketByOrder] = useState({});
  const [openOrderId, setOpenOrderId] = useState(null);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState(BLANK_ORDER);

  const [lineTarget, setLineTarget] = useState(null);
  const [lineForm, setLineForm] = useState(BLANK_LINE);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [o, c, s, p, cl, sl, jl] = await Promise.all([
      supabase.from('customer_orders').select('*, customers(company), order_lines(*, suppliers(company), products(commodity, pack_size))').order('order_date', { ascending: false }),
      supabase.from('customers').select('customer_id, company').order('company'),
      supabase.from('suppliers').select('supplier_id, company').order('company'),
      supabase.from('products').select('product_id, commodity, pack_size').order('commodity'),
      supabase.from('customer_locations').select('*').order('label'),
      supabase.from('supplier_locations').select('*').order('label'),
      supabase.from('jacket_lines').select('order_line_id, jackets(jacket_number)'),
    ]);
    setOrders(o.data || []);
    setCustomers(c.data || []);
    setSuppliers(s.data || []);
    setProducts(p.data || []);
    setCustLocations(cl.data || []);
    setSupLocations(sl.data || []);

    // map order_line_id -> jacket number(s), then roll up to order-level
    const jacketsByLine = {};
    (jl.data || []).forEach(row => {
      if (!row.jackets) return;
      jacketsByLine[row.order_line_id] = jacketsByLine[row.order_line_id] || [];
      jacketsByLine[row.order_line_id].push(row.jackets.jacket_number);
    });
    const byOrder = {};
    (o.data || []).forEach(ord => {
      const nums = new Set();
      (ord.order_lines || []).forEach(l => (jacketsByLine[l.order_line_id] || []).forEach(n => nums.add(n)));
      byOrder[ord.customer_order_id] = [...nums];
    });
    setJacketByOrder(byOrder);
  }

  function openNewOrder() { setOrderForm(BLANK_ORDER); setEditingOrderId(null); setShowNewOrder(true); }
  function openEditOrder(o) {
    setOrderForm({ acumatica_order_no: o.acumatica_order_no, customer_id: o.customer_id, customer_location_id: o.customer_location_id || '', customer_po: o.customer_po || '', order_date: o.order_date || '', requested_delivery: o.requested_delivery || '', salesperson: o.salesperson || '', order_status: o.order_status });
    setEditingOrderId(o.customer_order_id);
    setShowNewOrder(true);
  }
  async function saveOrder() {
    if (!orderForm.acumatica_order_no || !orderForm.customer_id) { alert('Acumatica Order # and Customer are both required.'); return; }
    const payload = {
      acumatica_order_no: orderForm.acumatica_order_no,
      customer_id: Number(orderForm.customer_id),
      customer_location_id: orderForm.customer_location_id ? Number(orderForm.customer_location_id) : null,
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

  function openAddLine(orderId) { setLineForm(BLANK_LINE); setLineTarget({ orderId, lineId: null }); }
  function openEditLine(orderId, l) {
    setLineForm({ supplier_id: l.supplier_id, supplier_location_id: l.supplier_location_id || '', product_id: l.product_id, shipper_po: l.shipper_po || '', cases_ordered: l.cases_ordered, sell_price_per_case: l.sell_price_per_case, fob_cost_per_case: l.fob_cost_per_case, pricing_type: l.pricing_type || 'FOB' });
    setLineTarget({ orderId, lineId: l.order_line_id });
  }
  async function saveLine() {
    if (!lineForm.supplier_id || !lineForm.product_id || !lineForm.cases_ordered) { alert('Supplier, Product, and Cases Ordered are required.'); return; }
    const payload = {
      supplier_id: Number(lineForm.supplier_id),
      supplier_location_id: lineForm.supplier_location_id ? Number(lineForm.supplier_location_id) : null,
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
      const original = { original_cases_ordered: payload.cases_ordered, original_sell_price_per_case: payload.sell_price_per_case, original_fob_cost_per_case: payload.fob_cost_per_case };
      const { error } = await supabase.from('order_lines').insert({ ...payload, ...original, customer_order_id: lineTarget.orderId, line_status: 'Open' });
      if (error) { alert('Save failed: ' + error.message); return; }
    }
    setLineTarget(null); setLineForm(BLANK_LINE);
    loadAll();
  }

  async function deleteLine(lineId) {
    if (!confirm('Delete this order line? If it\'s already assigned to a jacket, that assignment is removed too. This cannot be undone.')) return;
    const { data: jls } = await supabase.from('jacket_lines').select('jacket_line_id').eq('order_line_id', lineId);
    const jacketLineIds = (jls || []).map(r => r.jacket_line_id);
    if (jacketLineIds.length) {
      await supabase.from('stop_lines').delete().in('jacket_line_id', jacketLineIds);
      await supabase.from('jacket_lines').delete().in('jacket_line_id', jacketLineIds);
    }
    const { error } = await supabase.from('order_lines').delete().eq('order_line_id', lineId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }

  async function deleteOrder(orderId, orderNo) {
    if (!confirm(`Delete order ${orderNo} entirely, including all its lines and any jacket assignments? This cannot be undone.`)) return;
    const { data: ols } = await supabase.from('order_lines').select('order_line_id').eq('customer_order_id', orderId);
    const lineIds = (ols || []).map(r => r.order_line_id);
    if (lineIds.length) {
      const { data: jls } = await supabase.from('jacket_lines').select('jacket_line_id').in('order_line_id', lineIds);
      const jacketLineIds = (jls || []).map(r => r.jacket_line_id);
      if (jacketLineIds.length) {
        await supabase.from('stop_lines').delete().in('jacket_line_id', jacketLineIds);
        await supabase.from('jacket_lines').delete().in('jacket_line_id', jacketLineIds);
      }
      await supabase.from('order_lines').delete().in('order_line_id', lineIds);
    }
    const { error } = await supabase.from('customer_orders').delete().eq('customer_order_id', orderId);
    if (error) { alert('Delete failed: ' + error.message); return; }
    loadAll();
  }

  async function updateLineField(lineId, fieldName, value) {
    const { error } = await supabase.from('order_lines').update({ [fieldName]: value }).eq('order_line_id', lineId);
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
              <select value={orderForm.customer_id} onChange={e => setOrderForm({ ...orderForm, customer_id: e.target.value, customer_location_id: '' })} style={input}>
                <option value="">— select —</option>
                {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.company}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 13 }}>Delivery Location
              <select value={orderForm.customer_location_id} onChange={e => setOrderForm({ ...orderForm, customer_location_id: e.target.value })} style={input}>
                <option value="">Main profile address</option>
                {custLocations.filter(l => l.customer_id === Number(orderForm.customer_id)).map(l => <option key={l.location_id} value={l.location_id}>{l.label}</option>)}
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
          <button onClick={saveOrder} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>{editingOrderId ? 'Update Order' : 'Save Order'}</button>
          <button onClick={() => { setShowNewOrder(false); setEditingOrderId(null); }} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '16px 0', flexWrap: 'wrap' }}>
        {['Open', 'Closed', 'Cancelled', 'All'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className="fo-btn fo-btn-sm"
            style={{ background: statusFilter === s ? 'var(--fo-primary)' : 'var(--fo-card-bg)', color: statusFilter === s ? '#fff' : 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>
            {s}
          </button>
        ))}
        <input type="text" placeholder="Search order #, PO, or customer…" value={searchText} onChange={e => setSearchText(e.target.value)}
          style={{ flex: 1, minWidth: 220 }} />
      </div>

      <div className="fo-section" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {orders
        .filter(o => statusFilter === 'All' || o.order_status === statusFilter)
        .filter(o => {
          if (!searchText) return true;
          const q = searchText.toLowerCase();
          return o.acumatica_order_no?.toLowerCase().includes(q) || o.customer_po?.toLowerCase().includes(q) || o.customers?.company?.toLowerCase().includes(q);
        })
        .map(o => {
        const isOpen = openOrderId === o.customer_order_id;
        const jackets = jacketByOrder[o.customer_order_id] || [];
        return (
          <div key={o.customer_order_id} style={card}>
            <div style={btnRow}>
              <button onClick={() => setOpenOrderId(isOpen ? null : o.customer_order_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, flex: 1, textAlign: 'left' }}>
                <span>{isOpen ? '⌄' : '›'} <strong style={{ fontFamily: 'monospace' }}>{o.acumatica_order_no}</strong> {o.customers?.company} <span style={{ color: 'var(--fo-text-dim)', fontSize: 12 }}>PO {o.customer_po}</span></span>
              </button>
              <span style={jackets.length ? jacketPill : unassignedPill}>{jackets.length ? 'Jacket: ' + jackets.join(', ') : 'Unassigned'}</span>
              <span style={{ ...pill(o.order_status), marginLeft: 8 }}>{o.order_status}</span>
              <button onClick={() => openEditOrder(o)} style={{ ...editBtn, marginLeft: 8 }}>Edit Order</button>
              <button onClick={() => deleteOrder(o.customer_order_id, o.acumatica_order_no)} style={{ ...editBtn, marginLeft: 8, color: 'var(--fo-error)' }}>Delete Order</button>
            </div>
            {isOpen && (
              <div style={{ marginTop: 12 }}>
                <div className="fo-table-wrap">
                <table style={table} className="fo-table">
                  <thead><tr style={trHead}><th>Commodity</th><th>Supplier</th><th>Shipper PO</th><th style={{ textAlign: 'right' }}>Cases</th><th>Sell $/cs</th><th>Cost $/cs</th><th>Revenue</th><th>Margin</th><th></th></tr></thead>
                  <tbody>{(o.order_lines || []).map(l => {
                    const revenue = l.cases_ordered * l.sell_price_per_case;
                    const margin = revenue - (l.cases_ordered * l.fob_cost_per_case);
                    const amended = l.original_cases_ordered != null && Number(l.original_cases_ordered) !== Number(l.cases_ordered);
                    return (
                      <tr key={l.order_line_id} style={tr}>
                        <td>{l.products?.commodity} — {l.products?.pack_size}</td>
                        <td>{l.suppliers?.company}</td>
                        <td>{l.shipper_po}</td>
                        <td style={{ textAlign: 'right' }}>
                          {l.cases_ordered}
                          {amended && <div style={{ fontSize: 10, color: 'var(--fo-text-faint)' }}>orig: {l.original_cases_ordered}</div>}
                        </td>
                        <td><input type="number" defaultValue={l.sell_price_per_case} onBlur={e => updateLineField(l.order_line_id, 'sell_price_per_case', Number(e.target.value))} style={{ width: 72 }} /></td>
                        <td><input type="number" defaultValue={l.fob_cost_per_case} onBlur={e => updateLineField(l.order_line_id, 'fob_cost_per_case', Number(e.target.value))} style={{ width: 72 }} /></td>
                        <td>${revenue.toLocaleString()}</td>
                        <td style={{ color: margin >= 0 ? 'var(--fo-success)' : 'var(--fo-error)', fontWeight: 700 }}>${margin.toLocaleString()}</td>
                        <td><button onClick={() => openEditLine(o.customer_order_id, l)} style={editBtn}>Edit</button> <button onClick={() => deleteLine(l.order_line_id)} style={{ ...editBtn, color: 'var(--fo-error)' }}>Delete</button></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 8 }}>To amend an already-loaded order's quantity or price, use Load Tracking instead — that keeps the original number on file.</div>

                {lineTarget && lineTarget.orderId === o.customer_order_id ? (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #DCD5C1' }}>
                    <div style={grid}>
                      <label style={{ fontSize: 13 }}>Supplier
                        <select value={lineForm.supplier_id} onChange={e => setLineForm({ ...lineForm, supplier_id: e.target.value, supplier_location_id: '' })} style={input}>
                          <option value="">— select —</option>
                          {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
                        </select>
                      </label>
                      <label style={{ fontSize: 13 }}>Pickup Location
                        <select value={lineForm.supplier_location_id} onChange={e => setLineForm({ ...lineForm, supplier_location_id: e.target.value })} style={input}>
                          <option value="">Main profile address</option>
                          {supLocations.filter(l => l.supplier_id === Number(lineForm.supplier_id)).map(l => <option key={l.location_id} value={l.location_id}>{l.label}</option>)}
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
      </div>
    </AppShell>
  );
}

function field(label, value, onChange, type = 'text') {
  return (
    <label style={{ fontSize: 13 }}>
      <span className="fo-field-label">{label}</span>
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} style={input} />
    </label>
  );
}
function pill(status) {
  const styles = {
    Open: { background: 'var(--fo-success-bg)', color: 'var(--fo-success)' },
    Closed: { background: 'var(--fo-neutral-bg)', color: 'var(--fo-text-dim)' },
    Cancelled: { background: 'var(--fo-error-bg)', color: 'var(--fo-error)' },
  };
  return { display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, ...(styles[status] || styles.Closed) };
}
const jacketPill = { display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: 'var(--fo-info)', background: 'var(--fo-info-bg)', fontFamily: 'monospace' };
const unassignedPill = { display: 'inline-block', padding: '3px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, color: 'var(--fo-text-dim)', background: 'var(--fo-neutral-bg)' };
const btn = { padding: '10px 18px', background: 'var(--fo-primary)', color: '#fff', border: 'none', borderRadius: 'var(--fo-radius-md)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginBottom: 16 };
const editBtn = { padding: '6px 13px', fontSize: 12.5, background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border)', borderRadius: 'var(--fo-radius-sm)', cursor: 'pointer', fontWeight: 500 };
const btnRow = { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm)', padding: 18, marginBottom: 14 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };
const input = { display: 'block', width: '100%', marginTop: 4 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
