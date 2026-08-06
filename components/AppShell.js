// components/AppShell.js
// Shared sidebar + header + auth guard for every internal (staff) page.
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

export default function AppShell({ title, subtitle, children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [darkPreview, setDarkPreview] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // fast local cache so there's no flash of light theme before the
    // real account setting loads from Supabase below
    const cached = window.localStorage.getItem('fo-theme-cache');
    if (cached === 'dark') setDarkPreview(true);
  }, []);

  useEffect(() => { checkAuth(); }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkPreview);
    window.localStorage.setItem('fo-theme-cache', darkPreview ? 'dark' : 'light');
  }, [darkPreview]);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: staffRow } = await supabase.from('users').select('*').eq('user_id', user.id).single();
    if (!staffRow) { router.push('/login'); return; }
    setUserId(user.id);
    setDarkPreview(staffRow.appearance_theme === 'command_center_dark');
    setReady(true);
  }

  async function toggleTheme() {
    const next = !darkPreview;
    setDarkPreview(next);
    if (userId) {
      await supabase.from('users').update({ appearance_theme: next ? 'command_center_dark' : 'freshops_light' }).eq('user_id', userId);
    }
  }

  if (!ready) return <div style={{ padding: 40, color: 'var(--fo-text-dim)' }}>Loading…</div>;

  const today = new Date();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fo-page-bg)' }}>
      <div className="no-print" style={{ width: 224, flexShrink: 0, background: 'var(--fo-sidebar)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 16px 10px' }}>
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
        <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            style={{ width: '100%', padding: '9px', background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 36px', borderBottom: '1px solid var(--fo-border-soft)', background: 'var(--fo-card-bg)' }}>
          <div>
            <h1 className="fo-h1" style={{ marginBottom: subtitle ? 2 : 0 }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 13, color: 'var(--fo-text-dim)' }}>{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input placeholder="Search jackets, orders, products… (coming soon)" disabled
              style={{ width: 300, background: 'var(--fo-section-bg)', border: '1px solid var(--fo-border-soft)', color: 'var(--fo-text-faint)' }} />
            <div style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', textAlign: 'right', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
              {today.toLocaleDateString(undefined, { weekday: 'long' })}<br/>{today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={toggleTheme} className="fo-btn fo-btn-secondary fo-btn-sm" title="Saved to your account">
              {darkPreview ? '☀ Light' : '● Command Center'}
            </button>
          </div>
        </div>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 36px 48px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
