// components/AppShell.js
// Shared sidebar + auth guard for every internal (staff) page.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Logo from './Logo';

const NAV_SECTIONS = [
  {
    label: null,
    items: [{ href: '/app/dashboard', label: 'Dashboard' }],
  },
  {
    label: 'Sell & Source',
    items: [
      { href: '/app/orders', label: 'Customer Orders' },
      { href: '/app/jackets', label: 'InLoads / Jackets' },
      { href: '/app/ordering-needs', label: 'Ordering Needs' },
    ],
  },
  {
    label: 'Move It',
    items: [
      { href: '/app/dispatch', label: 'Dispatch & Freight' },
      { href: '/app/ops', label: 'Load Tracking' },
    ],
  },
  {
    label: 'Pricing',
    items: [
      { href: '/app/calls', label: 'Market Calls' },
      { href: '/app/pricesheets', label: 'Price Worksheet' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/app/reports', label: 'Reports' },
      { href: '/app/customers', label: 'Customers' },
      { href: '/app/suppliers', label: 'Suppliers' },
      { href: '/app/carriers', label: 'Carriers' },
      { href: '/app/products', label: 'Product Master' },
      { href: '/admin/requests', label: 'Order Requests' },
    ],
  },
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

  if (!ready) return <div style={{ padding: 40, fontFamily: 'sans-serif', color: 'var(--fo-text-dim)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fo-page-bg)' }}>
      <div className="no-print" style={{ width: 210, flexShrink: 0, background: 'var(--fo-sidebar)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <nav style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
          {NAV_SECTIONS.map((section, i) => (
            <div key={i}>
              {section.label && <div className="fo-nav-section-label">{section.label}</div>}
              {section.items.map(n => (
                <a key={n.href} href={n.href} className={'fo-navlink' + (router.pathname === n.href ? ' active' : '')}>
                  {n.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo variant="icon" size={22} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>FreshOps</div>
            <div style={{ fontSize: 10, color: 'var(--fo-sidebar-text-dim)' }}>Staff</div>
          </div>
        </div>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
          style={{ margin: 12, padding: '9px', background: 'rgba(255,255,255,.12)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
          Sign Out
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 28px 40px' }}>
          <div style={{ marginBottom: 22 }}>
            <Logo variant="horizontal" size={44} />
          </div>
          <h1 style={{ color: 'var(--fo-fresh)', fontSize: 21, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 18px' }}>{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
