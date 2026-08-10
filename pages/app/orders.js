// pages/app/orders.js
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

const BLANK_ORDER = { acumatica_order_no: '', customer_id: '', customer_location_id: '', customer_po: '', order_date: '', requested_delivery: '', salesperson: '', order_status: 'Open' };
// A customer order line has reached a final CUSTOMER outcome — separate
// from the claim lifecycle and the physical case lifecycle, which can
// both remain open/ongoing after the order itself closes.
const FINAL_LINE_STATUSES = ['Delivered', 'Rejected', 'Cancelled', 'Shorted'];
const BLANK_LINE = { product_id: '', cases_ordered: '', sell_price_per_case: '', pricing_type: 'FOB', line_status: 'Open' };

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
  const [allocByLine, setAllocByLine] = useState({});
  const [openOrderId, setOpenOrderId] = useState(null);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState(BLANK_ORDER);
  const [draftLines, setDraftLines] = useState([]);
  const [draftLineForm, setDraftLineForm] = useState(BLANK_LINE);

  const [lineTarget, setLineTarget] = useState(null);
  const [lineForm, setLineForm] = useState(BLANK_LINE);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [o, c, s, p, cl, sl, jl] = await Promise.all([
      supabase.from('customer_orders').select('*, customers(company), order_lines(*, suppliers(company), products(commodity, pack_size))').order('order_date', { ascending: false }).order('customer_order_id', { ascending: false }).order('order_line_id', { ascending: true, foreignTable: 'order_lines' }),
      supabase.from('customers').select('customer_id, company').eq('active', true).order('company'),
      supabase.from('suppliers').select('supplier_id, company').order('company'),
      supabase.from('products').select('product_id, commodity, pack_size').eq('active', true).order('commodity'),
      supabase.from('customer_locations').select('*').order('label'),
      supabase.from('supplier_locations').select('*').order('label'),
      supabase.from('jacket_lines').select('order_line_id, cases_to_load, jackets(jacket_number, jacket_status)'),
    ]);
    setOrders(o.data || []);
    setCustomers(c.data || []);
    setSuppliers(s.data || []);
    setProducts(p.data || []);
    setCustLocations(cl.data || []);
    setSupLocations(sl.data || []);

    // per-line: active allocated cases + which jacket(s), then roll up to order-level
    const allocByLine = {};
    (jl.data || []).forEach(row => {
      if (!row.jackets || row.jackets.jacket_status === 'Cancelled') return;
      if (!allocByLine[row.order_line_id]) allocByLine[row.order_line_id] = { cases: 0, jackets: [] };
      allocByLine[row.order_line_id].cases += Number(row.cases_to_load || 0);
      allocByLine[row.order_line_id].jackets.push(row.jackets.jacket_number);
    });
    setAllocByLine(allocByLine);
    const byOrder = {};
    (o.data || []).forEach(ord => {
      const nums = new Set();
      (ord.order_lines || []).forEach(l => (allocByLine[l.order_line_id]?.jackets || []).forEach(n => nums.add(n)));
      byOrder[ord.customer_order_id] = [...nums];
    });
    setJacketByOrder(byOrder);
  }

  function openNewOrder() { setOrderForm(BLANK_ORDER); setEditingOrderId(null); setDraftLines([]); setDraftLineForm(BLANK_LINE); setShowNewOrder(true); }
  function openEditOrder(o) {
    setOrderForm({ acumatica_order_no: o.acumatica_order_no, customer_id: o.customer_id, customer_location_id: o.customer_location_id || '', customer_po: o.customer_po || '', order_date: o.order_date || '', requested_delivery: o.requested_delivery || '', salesperson: o.salesperson || '', order_status: o.order_status });
    setEditingOrderId(o.customer_order_id);
    setShowNewOrder(true);
  }
  function addDraftLine() {
    if (!draftLineForm.product_id || !draftLineForm.cases_ordered) { alert('Product and Cases Ordered are required.'); return; }
    setDraftLines([...draftLines, draftLineForm]);
    setDraftLineForm(BLANK_LINE);
  }
  function removeDraftLine(index) { setDraftLines(draftLines.filter((_, i) => i !== index)); }

  async function saveOrder() {
    if (!orderForm.customer_id) { alert('Customer is required.'); return; }
    const payload = {
      acumatica_order_no: orderForm.acumatica_order_no || null,
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
      const { data: newOrder, error } = await supabase.from('customer_orders').insert({ ...payload, source: 'Internal' }).select().single();
      if (error) { alert('Save failed: ' + error.message); return; }
      if (draftLines.length) {
        const lineRows = draftLines.map(l => {
          const cases = Number(l.cases_ordered);
          const sell = l.sell_price_per_case ? Number(l.sell_price_per_case) : null;
          return {
            customer_order_id: newOrder.customer_order_id, product_id: Number(l.product_id), cases_ordered: cases,
            original_cases_ordered: cases, sell_price_per_case: sell, original_sell_price_per_case: sell,
            pricing_type: l.pricing_type, line_status: 'Open',
          };
        });
        const { error: lineErr } = await supabase.from('order_lines').insert(lineRows);
        if (lineErr) { alert('Order created, but the product lines failed: ' + lineErr.message); return; }
      }
    }
    setShowNewOrder(false); setEditingOrderId(null); setOrderForm(BLANK_ORDER); setDraftLines([]); setDraftLineForm(BLANK_LINE);
    loadAll();
  }

  function openAddLine(orderId) { setLineForm(BLANK_LINE); setLineTarget({ orderId, lineId: null }); }
  function openEditLine(orderId, l) {
    setLineForm({ product_id: l.product_id, cases_ordered: l.cases_ordered, sell_price_per_case: l.sell_price_per_case, pricing_type: l.pricing_type || 'FOB', line_status: l.line_status || 'Open' });
    setLineTarget({ orderId, lineId: l.order_line_id });
  }
  async function saveLine() {
    if (!lineForm.product_id || !lineForm.cases_ordered) { alert('Product and Cases Ordered are required.'); return; }
    const payload = {
      product_id: Number(lineForm.product_id),
      cases_ordered: Number(lineForm.cases_ordered),
      sell_price_per_case: lineForm.sell_price_per_case ? Number(lineForm.sell_price_per_case) : null,
      pricing_type: lineForm.pricing_type,
    };
    if (lineTarget.lineId) {
      // supplier_id / shipper_po / fob_cost_per_case are intentionally left
      // untouched here — those come from Jacket allocation now, not manual entry
      const { error } = await supabase.from('order_lines').update({ ...payload, line_status: lineForm.line_status }).eq('order_line_id', lineTarget.lineId);
      if (error) { alert('Save failed: ' + error.message); return; }
    } else {
      const original = { original_cases_ordered: payload.cases_ordered, original_sell_price_per_case: payload.sell_price_per_case };
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

  async function closeOrder(o) {
    const lines = o.order_lines || [];
    const notFinal = lines.filter(l => !FINAL_LINE_STATUSES.includes(l.line_status));
    if (notFinal.length > 0) {
      if (!confirm(`${notFinal.length} line(s) on this order haven't reached a final status yet (still shown as Open). Close the order anyway?`)) return;
    } else if (!confirm(`Close order ${o.acumatica_order_no || 'this order'}? Every line has reached a final outcome.`)) return;
    const { error } = await supabase.from('customer_orders').update({ order_status: 'Closed' }).eq('customer_order_id', o.customer_order_id);
    if (error) { alert('Close failed: ' + error.message); return; }
    loadAll();
  }
  async function deleteOrder(orderId, orderNo) {
    if (!confirm(`Delete order ${orderNo} entirely, including all its lines and any jacket assignments? This cannot be undone.`)) return;
    // order_lines, jacket_lines, and stop_lines all cascade automatically now
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
      {showNewOrder && !editingOrderId && (
        <div style={card}>
          <div style={grid}>
            {field('Acumatica Order # (optional — add later if you don\'t have it yet)', orderForm.acumatica_order_no, v => setOrderForm({ ...orderForm, acumatica_order_no: v }))}
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
          {!editingOrderId && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--fo-border)' }}>
              <div className="fo-h2">Product Lines</div>
              {draftLines.length > 0 && (
                <div className="fo-table-wrap" style={{ marginBottom: 12 }}>
                  <table style={table} className="fo-table">
                    <thead><tr style={trHead}><th>Product</th><th style={{ textAlign: 'right' }}>Cases</th><th style={{ textAlign: 'right' }}>Sell $/cs</th><th>Pricing</th><th></th></tr></thead>
                    <tbody>{draftLines.map((l, i) => {
                      const p = products.find(pr => pr.product_id === Number(l.product_id));
                      return (
                        <tr key={i} style={tr}>
                          <td>{p?.commodity} — {p?.pack_size}</td>
                          <td style={{ textAlign: 'right' }}>{l.cases_ordered}</td>
                          <td style={{ textAlign: 'right' }}>{l.sell_price_per_case ? `$${Number(l.sell_price_per_case).toFixed(2)}` : '—'}</td>
                          <td>{l.pricing_type}</td>
                          <td><button onClick={() => removeDraftLine(i)} style={{ background: 'none', border: 'none', color: 'var(--fo-error)', cursor: 'pointer' }}>✕</button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
              <div style={grid}>
                <label style={{ fontSize: 13 }}>Product
                  <select value={draftLineForm.product_id} onChange={e => setDraftLineForm({ ...draftLineForm, product_id: e.target.value })} style={input}>
                    <option value="">— select —</option>
                    {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
                  </select>
                </label>
                {field('Cases Ordered', draftLineForm.cases_ordered, v => setDraftLineForm({ ...draftLineForm, cases_ordered: v }), 'number')}
                {field('Sell Price / cs', draftLineForm.sell_price_per_case, v => setDraftLineForm({ ...draftLineForm, sell_price_per_case: v }), 'number')}
                <label style={{ fontSize: 13 }}>Pricing Type
                  <select value={draftLineForm.pricing_type} onChange={e => setDraftLineForm({ ...draftLineForm, pricing_type: e.target.value })} style={input}>
                    <option>FOB</option><option>Delivered</option>
                  </select>
                </label>
              </div>
              <button onClick={addDraftLine} style={{ background: 'none', border: 'none', color: 'var(--fo-accent)', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginTop: 8, padding: '4px 0' }}>+ Add Product Line</button>
            </div>
          )}
          <button onClick={saveOrder} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>{editingOrderId ? 'Update Order' : 'Save Order'}</button>
          <button onClick={() => { setShowNewOrder(false); setEditingOrderId(null); setDraftLines([]); }} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
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
        const orderNeedsSupply = (o.order_lines || []).reduce((s, l) => {
          const allocated = allocByLine[l.order_line_id]?.cases || 0;
          return s + Math.max(0, Number(l.cases_ordered || 0) - allocated);
        }, 0);
        const lines = o.order_lines || [];
        const readyToClose = o.order_status === 'Open' && lines.length > 0 && lines.every(l => FINAL_LINE_STATUSES.includes(l.line_status));
        return (
          <div key={o.customer_order_id} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setOpenOrderId(isOpen ? null : o.customer_order_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, textAlign: 'left', minWidth: 0, flex: '1 1 220px' }}>
                <span>{isOpen ? '⌄' : '›'} {o.acumatica_order_no ? <strong style={{ fontFamily: 'monospace' }}>{o.acumatica_order_no}</strong> : <span style={{ ...unassignedPill, background: 'var(--fo-warn-bg)', color: 'var(--fo-warn)' }}>No Acumatica #</span>} {o.customers?.company} <span style={{ color: 'var(--fo-text-dim)', fontSize: 12 }}>PO {o.customer_po}</span></span>
              </button>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {orderNeedsSupply > 0 && <span className="fo-badge fo-badge-amber">Needs Supply: {orderNeedsSupply}</span>}
                <span style={jackets.length ? jacketPill : unassignedPill}>{jackets.length ? 'Jacket: ' + jackets.join(', ') : 'Unassigned'}</span>
                {readyToClose && <span className="fo-badge fo-badge-green">Ready to Close</span>}
                <span style={pill(o.order_status)}>{o.order_status}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <button onClick={() => openEditOrder(o)} style={editBtn}>Edit Order</button>
              {o.order_status === 'Open' && <button onClick={() => closeOrder(o)} style={{ ...editBtn, background: readyToClose ? 'var(--fo-accent)' : editBtn.background, color: readyToClose ? '#fff' : editBtn.color }}>Close Order</button>}
              <button onClick={() => deleteOrder(o.customer_order_id, o.acumatica_order_no)} style={{ ...editBtn, color: 'var(--fo-error)' }}>Delete Order</button>
            </div>
            {editingOrderId === o.customer_order_id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--fo-border)' }}>
                <div style={grid}>
                  {field('Acumatica Order # (optional)', orderForm.acumatica_order_no, v => setOrderForm({ ...orderForm, acumatica_order_no: v }))}
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
                <button onClick={saveOrder} style={{ ...btn, background: 'var(--fo-accent)', marginTop: 12 }}>Update Order</button>
                <button onClick={() => { setEditingOrderId(null); setOrderForm(BLANK_ORDER); }} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid var(--fo-border)', marginTop: 12, marginLeft: 8 }}>Cancel</button>
              </div>
            )}
            {isOpen && (
              <div style={{ marginTop: 12 }}>
                <div className="fo-table-wrap">
                <table style={table} className="fo-table">
                  <thead><tr style={trHead}><th>Commodity</th><th style={{ textAlign: 'right' }}>Ordered</th><th style={{ textAlign: 'right' }}>Allocated</th><th style={{ textAlign: 'right' }}>Needs Supply</th><th>Allocation</th><th>Disposition</th><th>Jacket(s)</th><th>Sell $/cs</th><th>Revenue</th><th></th></tr></thead>
                  <tbody>{(o.order_lines || []).map(l => {
                    const revenue = l.cases_ordered * l.sell_price_per_case;
                    const amended = l.original_cases_ordered != null && Number(l.original_cases_ordered) !== Number(l.cases_ordered);
                    const alloc = allocByLine[l.order_line_id] || { cases: 0, jackets: [] };
                    const needsSupply = Math.max(0, Number(l.cases_ordered || 0) - alloc.cases);
                    const allocStatus = alloc.cases === 0 ? 'Unassigned' : needsSupply > 0 ? 'Partially Allocated' : 'Fully Allocated';
                    const allocStatusTone = allocStatus === 'Fully Allocated' ? 'fo-badge-green' : allocStatus === 'Partially Allocated' ? 'fo-badge-amber' : 'fo-badge-gray';
                    const dispositionTone = l.line_status === 'Delivered' ? 'fo-badge-green' : l.line_status === 'Rejected' ? 'fo-badge-red' : l.line_status === 'Shorted' ? 'fo-badge-amber' : l.line_status === 'Cancelled' ? 'fo-badge-gray' : 'fo-badge-gray';
                    return (
                      <tr key={l.order_line_id} style={tr}>
                        <td>{l.products?.commodity} — {l.products?.pack_size}</td>
                        <td style={{ textAlign: 'right' }}>
                          {l.cases_ordered}
                          {amended && <div style={{ fontSize: 10, color: 'var(--fo-text-faint)' }}>orig: {l.original_cases_ordered}</div>}
                        </td>
                        <td style={{ textAlign: 'right' }}>{alloc.cases}</td>
                        <td style={{ textAlign: 'right', color: needsSupply > 0 ? 'var(--fo-warn)' : 'var(--fo-text-dim)', fontWeight: needsSupply > 0 ? 600 : 400 }}>{needsSupply}</td>
                        <td><span className={`fo-badge ${allocStatusTone}`}>{allocStatus}</span></td>
                        <td><span className={`fo-badge ${dispositionTone}`}>{l.line_status || 'Open'}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--fo-text-dim)' }}>{alloc.jackets.length ? alloc.jackets.join(', ') : '—'}</td>
                        <td><input type="number" defaultValue={l.sell_price_per_case} onBlur={e => updateLineField(l.order_line_id, 'sell_price_per_case', Number(e.target.value))} style={{ width: 72 }} /></td>
                        <td>${revenue.toLocaleString()}</td>
                        <td><button onClick={() => openEditLine(o.customer_order_id, l)} style={editBtn}>Edit</button> <button onClick={() => deleteLine(l.order_line_id)} style={{ ...editBtn, color: 'var(--fo-error)' }}>Delete</button></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
                </div>
                <div style={{ fontSize: 11, color: 'var(--fo-text-faint)', marginTop: 8 }}>Supplier and cost come from Jacket allocation — assign this line to a Jacket to see them there.</div>

                {lineTarget && lineTarget.orderId === o.customer_order_id ? (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #DCD5C1' }}>
                    <div style={grid}>
                      <label style={{ fontSize: 13 }}>Product
                        <select value={lineForm.product_id} onChange={e => setLineForm({ ...lineForm, product_id: e.target.value })} style={input}>
                          <option value="">— select —</option>
                          {products.map(p => <option key={p.product_id} value={p.product_id}>{p.commodity} — {p.pack_size}</option>)}
                        </select>
                      </label>
                      {field('Cases Ordered', lineForm.cases_ordered, v => setLineForm({ ...lineForm, cases_ordered: v }), 'number')}
                      {field('Sell Price / cs', lineForm.sell_price_per_case, v => setLineForm({ ...lineForm, sell_price_per_case: v }), 'number')}
                      <label style={{ fontSize: 13 }}>Pricing Type
                        <select value={lineForm.pricing_type} onChange={e => setLineForm({ ...lineForm, pricing_type: e.target.value })} style={input}>
                          <option>FOB</option><option>Delivered</option>
                        </select>
                      </label>
                      {lineTarget.lineId && (
                        <label style={{ fontSize: 13 }}>Disposition
                          <select value={lineForm.line_status} onChange={e => setLineForm({ ...lineForm, line_status: e.target.value })} style={input}>
                            {FINAL_LINE_STATUSES.concat('Open').map(s => <option key={s}>{s}</option>)}
                          </select>
                        </label>
                      )}
                    </div>
                    <button onClick={saveLine} style={{ ...btn, background: '#6B8E4E', marginTop: 12 }}>{lineTarget.lineId ? 'Update Line' : 'Save Line'}</button>
                    <button onClick={() => setLineTarget(null)} style={{ ...btn, background: 'var(--fo-card-bg)', color: 'var(--fo-text)', border: '1px solid #DCD5C1', marginTop: 12, marginLeft: 8 }}>Cancel</button>
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
const card = { background: 'var(--fo-card-bg)', border: '1px solid var(--fo-border-soft)', borderRadius: 'var(--fo-radius-lg)', boxShadow: 'var(--fo-shadow-sm), var(--fo-glow)', padding: 18, marginBottom: 14 };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 };
const input = { display: 'block', width: '100%', marginTop: 4 };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: 'var(--fo-text-dim)' };
const tr = {};
