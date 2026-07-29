// pages/portal/index.js
// The page a customer lands on after logging in: their current price
// sheet, and a simple form to submit an order REQUEST (not a firm order —
// staff review and convert it, per the review-queue design).
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';

export default function PortalHome() {
  const router = useRouter();
  const [customer, setCustomer] = useState(null);
  const [priceLines, setPriceLines] = useState([]);
  const [cart, setCart] = useState({}); // { product_id: cases }
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/portal/login'); return; }

    const { data: cust } = await supabase.from('customers').select('*').eq('portal_auth_id', user.id).single();
    setCustomer(cust);

    // most recent price sheet sent to this customer
    const { data: recip } = await supabase
      .from('price_sheet_recipients')
      .select('price_sheet_id, sent_at')
      .eq('customer_id', cust.customer_id)
      .order('sent_at', { ascending: false })
      .limit(1)
      .single();

    if (recip) {
      const { data: lines } = await supabase
        .from('price_sheet_lines')
        .select('price_sheet_line_id, product_id, cost_price, margin_pct, products(commodity, pack_size)')
        .eq('price_sheet_id', recip.price_sheet_id);
      setPriceLines(lines || []);
    }
    setLoading(false);
  }

  function updateCart(productId, cases) {
    setCart({ ...cart, [productId]: cases });
  }

  async function submitRequest() {
    const items = Object.entries(cart).filter(([, cases]) => Number(cases) > 0);
    if (items.length === 0) return;

    const { data: req } = await supabase
      .from('order_requests')
      .insert({ customer_id: customer.customer_id })
      .select()
      .single();

    await supabase.from('order_request_lines').insert(
      items.map(([product_id, cases]) => ({ request_id: req.request_id, product_id: Number(product_id), cases_requested: Number(cases) }))
    );

    // notify staff — see lib/notify.js / Supabase Edge Function note in SETUP-GUIDE.md
    await fetch('/api/notify-new-request', { method: 'POST', body: JSON.stringify({ requestId: req.request_id }) });

    setSubmitted(true);
  }

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (submitted) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h2 style={{ color: '#2F5233' }}>Request received</h2>
          <p>Thanks — your order request has been sent to our team for confirmation. We'll follow up shortly with final pricing and availability.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.card, width: 640 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ color: '#2F5233', margin: 0 }}>{customer.company}</h1>
            <p style={{ color: '#78716c', margin: '4px 0 0' }}>Current Pricing — request what you need below</p>
          </div>
          <button style={styles.logout} onClick={async () => { await supabase.auth.signOut(); router.push('/portal/login'); }}>Sign Out</button>
        </div>

        <table style={{ width: '100%', marginTop: 20, fontSize: 14, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#78716c', borderBottom: '1px solid #DCD5C1' }}>
              <th style={{ padding: '6px 4px' }}>Commodity</th>
              <th>Pack</th>
              <th style={{ textAlign: 'right' }}>Price / Case</th>
              <th style={{ textAlign: 'right' }}>Cases</th>
            </tr>
          </thead>
          <tbody>
            {priceLines.map(l => {
              const price = (l.cost_price * (1 + l.margin_pct / 100)).toFixed(2);
              return (
                <tr key={l.price_sheet_line_id} style={{ borderBottom: '1px solid #DCD5C1' }}>
                  <td style={{ padding: '6px 4px' }}>{l.products.commodity}</td>
                  <td>{l.products.pack_size}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#2F5233' }}>${price}</td>
                  <td style={{ textAlign: 'right' }}>
                    <input type="number" min="0" style={{ width: 70, textAlign: 'right' }}
                      onChange={e => updateCart(l.product_id, e.target.value)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <button style={{ ...styles.button, marginTop: 20 }} onClick={submitRequest}>Submit Order Request</button>
        <p style={{ fontSize: 12, color: '#a8a29e', marginTop: 12 }}>
          This is a request, not a confirmed order — our team will follow up to confirm final pricing, availability, and delivery.
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: '#F6F4EC', fontFamily: 'sans-serif', padding: 40 },
  card: { background: '#fff', border: '1px solid #DCD5C1', borderRadius: 10, padding: 32 },
  button: { padding: '10px 20px', background: '#2F5233', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  logout: { padding: '6px 12px', background: '#fff', border: '1px solid #DCD5C1', borderRadius: 6, fontSize: 12, cursor: 'pointer' },
};
