// components/charts.js
// Simple, dependency-free bar chart — plain divs, no chart library, since
// recharts isn't an installed dependency and adding one this late risks a
// build failure the same way an unverified package would anywhere else.

export function ProgressBar({ label, current, max, unit = '', height = 8 }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const over = current > max;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--fo-text-dim)' }}>{label}</span>
        <span style={{ fontWeight: 600, color: over ? 'var(--fo-error)' : 'var(--fo-text)' }}>{current.toLocaleString()}{unit} / {max.toLocaleString()}{unit}</span>
      </div>
      <div style={{ height, background: 'var(--fo-section-bg)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: over ? 'var(--fo-error)' : pct > 85 ? 'var(--fo-warn)' : 'var(--fo-accent)', borderRadius: 999, transition: 'width .3s ease' }} />
      </div>
    </div>
  );
}

export function BarChart({ data, formatValue, height = 22, emptyText = 'No data yet.' }) {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--fo-text-faint)', fontSize: 13 }}>{emptyText}</div>;
  }
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, fontSize: 12, color: 'var(--fo-text-dim)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
          <div style={{ flex: 1, background: 'var(--fo-section-bg)', borderRadius: 4, overflow: 'hidden', height }}>
            <div style={{
              width: `${Math.max((Math.abs(d.value) / max) * 100, d.value === 0 ? 0 : 2)}%`, height: '100%',
              background: d.color || (d.value < 0 ? 'var(--fo-error)' : 'var(--fo-accent)'),
              borderRadius: 4, transition: 'width .3s ease',
            }} />
          </div>
          <div style={{ width: 90, fontSize: 12, fontWeight: 600, color: d.value < 0 ? 'var(--fo-error)' : 'var(--fo-text)', flexShrink: 0 }}>
            {formatValue ? formatValue(d.value) : d.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
