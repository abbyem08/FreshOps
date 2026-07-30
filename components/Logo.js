// components/Logo.js
// Uses the actual logo you designed in Canva (exported PNG, background
// made transparent). Two image assets live in /public/brand:
//   - freshops-full.png  → the full lockup (wreath + FreshOps + tagline)
//   - freshops-icon.png  → just the circular leaf wreath, for tight spaces
//
// Usage:
//   <Logo />                    — full lockup, height defaults to 56px
//   <Logo variant="icon" />     — icon only (e.g. small sidebar mark)
//   <Logo height={80} />        — resize, width scales automatically

export default function Logo({ height = 56, variant = 'full' }) {
  const src = variant === 'icon' ? '/brand/freshops-icon.png' : '/brand/freshops-full.png';
  const alt = variant === 'icon' ? 'FreshOps' : 'FreshOps — Business Intelligence';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} style={{ height, width: 'auto', display: 'inline-block' }} />
  );
}
