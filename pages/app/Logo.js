// components/Logo.js
// The leaf-wreath icon is your real designed image (public/brand/freshops-icon.png).
// "FreshOps" is real text, not part of the image — it inherits whatever font
// the rest of the app is already using wherever it's placed, so it always
// matches, and stays crisp at any size.
//
// Usage:
//   <Logo variant="stacked" size={64} />     — icon on top, wordmark + tagline
//                                               centered below, for login pages
//   <Logo variant="horizontal" size={32} />  — icon left, wordmark + tagline
//                                               right, for inside the app
//   <Logo variant="icon" size={32} />        — icon only, no text

const FRESH_COLOR = '#214B34';
const OPS_COLOR = '#6DAA45';

function Icon({ size }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/freshops-icon.png" alt="FreshOps" style={{ height: size, width: size, display: 'block', objectFit: 'contain' }} />
  );
}

function Wordmark({ size, showTagline }) {
  return (
    <div style={{ lineHeight: 1.1 }}>
      <div style={{ fontWeight: 700, fontSize: size * 0.85, letterSpacing: '0.01em' }}>
        <span style={{ color: FRESH_COLOR }}>Fresh</span><span style={{ color: OPS_COLOR }}>Ops</span>
      </div>
      {showTagline && (
        <div style={{ fontSize: Math.max(size * 0.42, 9), letterSpacing: '0.1em', color: '#78716c', marginTop: 2 }}>BUSINESS INTELLIGENCE</div>
      )}
    </div>
  );
}

export default function Logo({ variant = 'horizontal', size = 32, showTagline = true }) {
  if (variant === 'icon') return <Icon size={size} />;

  if (variant === 'stacked') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.22 }}>
        <Icon size={size} />
        <Wordmark size={size * 0.42} showTagline={showTagline} />
      </div>
    );
  }

  // horizontal (default) — for inside the app
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.35 }}>
      <Icon size={size} />
      <Wordmark size={size * 0.5} showTagline={showTagline} />
    </div>
  );
}
