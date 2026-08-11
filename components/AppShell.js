// components/AppShell.js
// Shared sidebar + header + auth guard for every internal (staff) page.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Logo from './Logo';
import {
  IconDashboard, IconOrders, IconJacket, IconNeeds, IconCalls, IconPricing,
  IconReports, IconCustomers, IconRequests,
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
    label: 'Pricing',
    items: [
      { href: '/app/calls', label: 'Market Calls', Icon: IconCalls },
      { href: '/app/pricesheets', label: 'Price Sheets', Icon: IconPricing },
    ],
  },
  {
    label: 'Reference',
    items: [
      { href: '/app/reports', label: 'Reports', Icon: IconReports },
      { href: '/app/masters', label: 'Masters', Icon: IconCustomers },
      { href: '/admin/requests', label: 'Order Requests', Icon: IconRequests },
    ],
  },
];

export default function AppShell({ title, subtitle, children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [darkPreview, setDarkPreview] = useState(false);
  const [userId, setUserId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    // close the drawer automatically on route change (selecting a nav item)
    const handler = () => setDrawerOpen(false);
    router.events.on('routeChangeStart', handler);
    return () => router.events.off('routeChangeStart', handler);
  }, [router.events]);

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
      <div className={'no-print fo-sidebar-backdrop' + (drawerOpen ? ' open' : '')} onClick={() => setDrawerOpen(false)} />
      <div className={'no-print fo-sidebar' + (drawerOpen ? ' open' : '')} style={{ background: 'var(--fo-sidebar)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo variant="horizontal" size={24} showTagline={false} />
          <button className="fo-drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
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

      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <div className="no-print fo-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 36px', borderBottom: '1px solid var(--fo-border-soft)', background: 'var(--fo-card-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="fo-hamburger-btn" onClick={() => setDrawerOpen(true)} aria-label="Open menu">☰</button>
            <div style={{ minWidth: 0 }}>
              <h1 className="fo-h1" style={{ marginBottom: subtitle ? 2 : 0 }}>{title}</h1>
              {subtitle && <div style={{ fontSize: 13, color: 'var(--fo-text-dim)' }}>{subtitle}</div>}
            </div>
          </div>
          <div className="fo-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input className="fo-header-search" placeholder="Search jackets, orders, products… (coming soon)" disabled
              style={{ width: 300, background: 'var(--fo-section-bg)', border: '1px solid var(--fo-border-soft)', color: 'var(--fo-text-faint)' }} />
            <div className="fo-header-date" style={{ fontSize: 12.5, color: 'var(--fo-text-dim)', textAlign: 'right', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
              {today.toLocaleDateString(undefined, { weekday: 'long' })}<br/>{today.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={toggleTheme} className="fo-btn fo-btn-secondary fo-btn-sm" title="Saved to your account">
              {darkPreview ? '☀ Light' : '● Command Center'}
            </button>
          </div>
        </div>
        <div className="app-content-area" style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 36px 48px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
