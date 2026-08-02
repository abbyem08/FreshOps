// components/icons.js
// Simple, consistent stroke icons — hand-built instead of pulling in a new
// npm package (lucide-react isn't currently installed, and adding a new
// dependency risks a build failure the same way the postgres client
// version mismatch did earlier). All icons use currentColor so they pick
// up whatever text color surrounds them, and share one visual style.

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconDashboard({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
}
export function IconOrders({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M7 3h10l1 4H6l1-4Z"/><path d="M6 7h12l-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7Z"/><path d="M10 11v5M14 11v5"/></svg>;
}
export function IconJacket({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><rect x="2" y="7" width="14" height="10" rx="1.5"/><path d="M16 10h3l3 3v4h-6"/><circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/></svg>;
}
export function IconNeeds({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>;
}
export function IconCalls({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M4 5c0 8 7 15 15 15l2-4-6-2-2 2c-3-1.5-4.5-3-6-6l2-2-2-6-4 2z"/></svg>;
}
export function IconPricing({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="9"/><path d="M9.5 15c.5 1 1.5 1.5 2.7 1.5 1.7 0 3-1 3-2.4 0-3-6-1.5-6-4.5 0-1.4 1.3-2.4 3-2.4 1.2 0 2.2.5 2.7 1.5"/><path d="M12 6.5v11"/></svg>;
}
export function IconReports({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M5 21V10M12 21V4M19 21v-7"/></svg>;
}
export function IconCustomers({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><circle cx="9" cy="8" r="3.3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="18" cy="8.5" r="2.5"/><path d="M15.5 14.2c2.7.3 4.8 2.6 4.8 5.8"/></svg>;
}
export function IconSuppliers({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M3 10l9-6 9 6"/><path d="M5 10v9h14v-9"/><path d="M10 19v-5h4v5"/></svg>;
}
export function IconCarriers({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><rect x="2" y="9" width="12" height="8" rx="1.3"/><path d="M14 12h4l3 3v2h-7"/><circle cx="6.5" cy="18.5" r="1.6"/><circle cx="17.5" cy="18.5" r="1.6"/></svg>;
}
export function IconProduct({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="M4 7.5L12 12l8-4.5M12 12v9"/></svg>;
}
export function IconRequests({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
}
