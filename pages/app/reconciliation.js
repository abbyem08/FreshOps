// pages/app/reconciliation.js
import { useEffect, useState, Fragment } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabaseClient';

export default function ReconciliationPage() {
  const [shortLines, setShortLines] = useState([]);
  const [extras, setExtras] = useState([]);
  const [orders, setOrders] = useState([]);
  const [addToOrderId, setAddToOrderId] = useState(null);
  const [addToOrderForm, setAddToOrderForm] = useState({ order_id: '', supplier_id: '' });
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: jl } = await supabase
      .from('jacket_lines')
      .select('*, jackets(jacket_number), order_lines(products(commodity, pack_size), customer_orders(acumatica_order_no, customers(company)))')
      .order('jacket_id');
    setShortLines((jl || []).filter(l => Number(l.actual_cases_loaded || 0) > Number(l.actual_cases_delivered || 0)));

    const { data: ex } = await supabase
      .from('jacket_extras')
      .select('*, jackets(jacket_number), products(commodity, pack_size)')
      .neq('status', 'Sold')
      .order('jacket_id');
    setExtras(ex || []);

    const { data: o } = await supabase.from('customer_orders').select('customer_order_id, acumatica_order_no, customers(company)').eq('order_status', 'Open').order('acumatica_order_no');
    setOrders(o || []);
    const { data: s } = await supabase.from('suppliers').select('supplier_id, company').order('company');
    setSuppliers(s || []);
  }

  async function updateExtra(id, field, value) {
    const { error } = await supabase.from('jacket_extras').update({ [field]: value }).eq('extra_id', id);
    if (error) { alert('Update failed: ' + error.message); return; }
    load();
  }

  async function addToOrder(extra) {
    if (!addToOrderForm.order_id || !addToOrderForm.supplier_id) { alert('Pick both an order and a supplier.'); return; }
    const { error } = await supabase.from('order_lines').insert({
      customer_order_id: Number(addToOrderForm.order_id),
      supplier_id: Number(addToOrderForm.supplier_id),
      product_id: extra.product_id,
      cases_ordered: extra.cases,
      line_status: 'Open',
    });
    if (error) { alert('Failed to add to order: ' + error.message); return; }
    const orderLabel = orders.find(o => o.customer_order_id === Number(addToOrderForm.order_id))?.acumatica_order_no;
    await supabase.from('jacket_extras').update({ status: 'Sold', resolution_notes: `Added to order ${orderLabel}` }).eq('extra_id', extra.extra_id);
    setAddToOrderId(null);
    setAddToOrderForm({ order_id: '', supplier_id: '' });
    load();
  }

  return (
    <AppShell title="Jacket Reconciliation">
      <div style={{ color: '#78716c', fontSize: 13, marginBottom: 16 }}>Product physically on a truck that isn't fully accounted for yet — either loaded but not delivered, or rolled/extra product you still need to sell or return.</div>

      <div style={{ fontWeight: 600, color: '#2F5233', marginBottom: 8 }}>Undelivered Cases</div>
      {shortLines.length === 0 ? <p style={{ color: '#a8a29e' }}>Nothing outstanding — loaded matches delivered on every line.</p> : (
        <table style={{ ...table, marginBottom: 24 }}>
          <thead><tr style={trHead}><th>Jacket</th><th>Order #</th><th>Customer</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Loaded</th><th style={{ textAlign: 'right' }}>Delivered</th><th style={{ textAlign: 'right' }}>Short</th></tr></thead>
          <tbody>{shortLines.map(l => (
            <tr key={l.jacket_line_id} style={tr}>
              <td style={{ fontFamily: 'monospace' }}>{l.jackets?.jacket_number}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{l.order_lines?.customer_orders?.acumatica_order_no}</td>
              <td>{l.order_lines?.customer_orders?.customers?.company}</td>
              <td>{l.order_lines?.products?.commodity} — {l.order_lines?.products?.pack_size}</td>
              <td style={{ textAlign: 'right' }}>{l.actual_cases_loaded}</td>
              <td style={{ textAlign: 'right' }}>{l.actual_cases_delivered}</td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#C0562D' }}>{l.actual_cases_loaded - l.actual_cases_delivered}</td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <div style={{ fontWeight: 600, color: '#2F5233', marginBottom: 8 }}>Rolled / Extra Product to Sell or Resolve</div>
      {extras.length === 0 ? <p style={{ color: '#a8a29e' }}>No unresolved rolled product right now.</p> : (
        <table style={table}>
          <thead><tr style={trHead}><th>Jacket</th><th>Commodity</th><th style={{ textAlign: 'right' }}>Cases</th><th>Status</th><th>Notes</th><th></th></tr></thead>
          <tbody>{extras.map(x => (
            <Fragment key={x.extra_id}>
              <tr key={x.extra_id} style={tr}>
                <td style={{ fontFamily: 'monospace' }}>{x.jackets?.jacket_number}</td>
                <td>{x.products?.commodity} — {x.products?.pack_size}</td>
                <td style={{ textAlign: 'right' }}>{x.cases}</td>
                <td>
                  <select defaultValue={x.status} onChange={e => updateExtra(x.extra_id, 'status', e.target.value)}>
                    <option>Unsold</option><option>Trying to Sell</option><option>Sold</option>
                  </select>
                </td>
                <td><input type="text" defaultValue={x.resolution_notes || ''} onBlur={e => updateExtra(x.extra_id, 'resolution_notes', e.target.value)} style={{ width: 200 }} placeholder="How was this resolved?" /></td>
                <td><button onClick={() => setAddToOrderId(addToOrderId === x.extra_id ? null : x.extra_id)} style={editBtn}>Add to Order</button></td>
              </tr>
              {addToOrderId === x.extra_id && (
                <tr>
                  <td colSpan={6} style={{ background: '#F6F4EC', padding: 12 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                      <label style={{ fontSize: 13 }}>Add to which order?
                        <select value={addToOrderForm.order_id} onChange={e => setAddToOrderForm({ ...addToOrderForm, order_id: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, minWidth: 220 }}>
                          <option value="">— select —</option>
                          {orders.map(o => <option key={o.customer_order_id} value={o.customer_order_id}>{o.acumatica_order_no} — {o.customers?.company}</option>)}
                        </select>
                      </label>
                      <label style={{ fontSize: 13 }}>Supplier (for the new line)
                        <select value={addToOrderForm.supplier_id} onChange={e => setAddToOrderForm({ ...addToOrderForm, supplier_id: e.target.value })} style={{ display: 'block', padding: '6px 8px', marginTop: 4, minWidth: 180 }}>
                          <option value="">— select —</option>
                          {suppliers.map(s => <option key={s.supplier_id} value={s.supplier_id}>{s.company}</option>)}
                        </select>
                      </label>
                      <button onClick={() => addToOrder(x)} style={{ padding: '8px 16px', background: '#6B8E4E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Confirm</button>
                    </div>
                    <div style={{ fontSize: 11, color: '#a8a29e', marginTop: 6 }}>Creates a new order line under that order for these {x.cases} cases (pricing left blank — set it on Customer Orders), and marks this extra as Sold.</div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}</tbody>
        </table>
      )}
    </AppShell>
  );
}

const editBtn = { padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, cursor: 'pointer' };
const table = { width: '100%', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 8, borderCollapse: 'collapse', fontSize: 13.5 };
const trHead = { textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' };
const tr = { borderBottom: '1px solid #DCD5C1' };
