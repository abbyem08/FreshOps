// components/ProductIcon.js
// Small internal product icon — supplements the commodity name, never
// replaces it. Renders nothing (not a broken-image icon) if the commodity
// isn't in the centralized mapping.
import { getSingleImage } from '../lib/productImages';

export default function ProductIcon({ commodity, size = 24 }) {
  const src = getSingleImage(commodity);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}
