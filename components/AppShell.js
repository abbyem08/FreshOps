// components/AppShell.js
// Shared sidebar + auth guard for every internal (staff) page.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Logo from './Logo';

const NAV = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/orders', label: 'Customer Orders' },
  { href: '/app/jackets', label: 'Jackets' },
  { href: '/app/dispatch', label: 'Dispatch & Freight' },
  { href: '/app/ops', label: 'Load Tracking' },
  { href: '/app/calls', label: 'Market Calls' },
  { href: '/app/pricesheets', label: 'Price Worksheet' },
  { href: '/app/ordering-needs', label: 'Ordering Needs' },
  { href: '/app/reports', label: 'Reports' },
  { href: '/app/customers', label: 'Customers' },
  { href: '/app/suppliers', label: 'Suppliers' },
  { href: '/app/carriers', label: 'Carriers' },
  { href: '/app/products', label: 'Product Master' },
];

export default function AppShell({ title, children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: staffRow } = await supabase.from('users').select('*').eq('user_id', user.id).single();
    if (!staffRow) { router.push('/login'); return; }
    setReady(true);
  }

  if (!ready) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', background: '#F6F4EC' }}>
      <div className="no-print" style={{ width: 200, flexShrink: 0, background: '#2F5233', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {NAV.map(n => (
            <a key={n.href} href={n.href} style={{
              display: 'block', padding: '10px 16px', fontSize: 13.5, color: 'rgba(255,255,255,.88)',
              textDecoration: 'none', background: router.pathname === n.href ? 'rgba(255,255,255,.15)' : 'transparent'
            }}>{n.label}</a>
          ))}
          <a href="/admin/requests" style={{ display: 'block', padding: '10px 16px', fontSize: 13.5, color: 'rgba(255,255,255,.88)', textDecoration: 'none' }}>Order Requests</a>
        </nav>
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo variant="icon" size={22} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>FreshOps</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)' }}>Staff</div>
          </div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
          style={{ margin: 12, padding: '8px', background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
      <div style={{ flex: 1, padding: 28, overflow: 'auto' }}>
        <div style={{ marginBottom: 20 }}>
          <Logo variant="horizontal" size={44} />
        </div>
        <h1 style={{ color: '#2F5233', fontSize: 20, marginTop: 0 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
