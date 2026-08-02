// components/AppShell.js
// Shared sidebar + auth guard for every internal (staff) page.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Logo from './Logo';
import {
  IconDashboard, IconOrders, IconJacket, IconNeeds, IconCalls, IconPricing,
  IconReports, IconCustomers, IconSuppliers, IconCarriers, IconProduct, IconRequests,
} from './icons';

const NAV_SECTIONS = [
  {
    label: null,
    items: [{ href: '/app/dashboard', label: 'Dashboard', Icon: IconDashboard }],
  },
  {
    label: 'Sell & Source',
    items: [
      { href: '/app/orders', label: 'Customer Orders', Icon: IconOrders },
      { href: '/app/jackets', label: 'InLoads / Jackets', Icon: IconJacket },
      { href: '/app/ordering-needs', label: 'Ordering Needs', Icon: IconNeeds },
    ],
  },
  {
    label: 'Move It',
    items: [
      { href: '/app/dispatch', label: 'Dispatch & Freight', Icon: IconJacket },
      { href: '/app/ops', label: 'Load Tracking', Icon: IconNeeds },
    ],
  },
  {
    label: 'Pricing',
    items: [
      { href: '/app/calls', label: 'Market Calls', Icon: IconCalls },
      { href: '/app/pricesheets', label: 'Price Worksheet', Icon: IconPricing },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/app/reports', label: 'Reports', Icon: IconReports },
      { href: '/app/customers', label: 'Customers', Icon: IconCustomers },
      { href: '/app/suppliers', label: 'Suppliers', Icon: IconSuppliers },
      { href: '/app/carriers', label: 'Carriers', Icon: IconCarriers },
      { href: '/app/products', label: 'Product Master', Icon: IconProduct },
      { href: '/admin/requests', label: 'Order Requests', Icon: IconRequests },
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

  if (!ready) return <div style={{ padding: 40, color: 'var(--fo-text-dim)' }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fo-page-bg)' }}>
      <div className="no-print" style={{ width: 226, flexShrink: 0, background: 'var(--fo-nav-bg)', borderRight: '1px solid var(--fo-border-soft)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px 8px' }}>
          <Logo variant="icon" size={26} />
        </div>
        <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
          {NAV_SECTIONS.map((section, i) => (
            <div key={i}>
              {section.label && <div className="fo-nav-section-label">{section.label}</div>}
              {section.items.map(n => {
                const isActive = router.pathname === n.href;
                return (
                  <a key={n.href} href={n.href} className={'fo-navlink' + (isActive ? ' active' : '')}>
                    <n.Icon size={17} />
                    {n.label}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        <div style={{ padding: 12, borderTop: '1px solid var(--fo-border-soft)' }}>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="fo-btn fo-btn-secondary fo-btn-sm" style={{ width: '100%' }}>
            Sign Out
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 36px 48px' }}>
          <h1 className="fo-h1">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
