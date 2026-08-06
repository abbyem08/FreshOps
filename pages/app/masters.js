// pages/app/masters.js
import { useState } from 'react';
import AppShell from '../../components/AppShell';
import { CustomersContent } from './customers';
import { SuppliersContent } from './suppliers';
import { CarriersContent } from './carriers';
import { ProductsContent } from './products';

const TABS = [
  { key: 'customers', label: 'Customers', Content: CustomersContent },
  { key: 'suppliers', label: 'Suppliers', Content: SuppliersContent },
  { key: 'carriers', label: 'Carriers', Content: CarriersContent },
  { key: 'products', label: 'Product Master', Content: ProductsContent },
];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState('customers');
  const Active = TABS.find(t => t.key === activeTab)?.Content;

  return (
    <AppShell title="Masters">
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className="fo-btn fo-btn-sm"
            style={{ background: activeTab === t.key ? 'var(--fo-primary)' : 'var(--fo-card-bg)', color: activeTab === t.key ? '#fff' : 'var(--fo-text)', border: '1px solid var(--fo-border)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {Active && <Active />}
    </AppShell>
  );
}
