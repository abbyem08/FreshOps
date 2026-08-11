// lib/productImages.js
//
// Centralized commodity -> image path mapping. Product photos are static
// files in /public/products, not database-backed (intentional — the image
// is generic per commodity right now, not supplier/variety-specific; see
// FRESHOPS_PRODUCT_BIBLE.md if that ever changes).
//
// Never hard-code an image path in a page. Always go through
// getClusterImage() / getSingleImage() below, so every page agrees on the
// same mapping and the same fallback behavior.

const IMAGE_MAP = {
  orange:      { single: '/products/singles/orange-single.png',      cluster: '/products/price-sheet/orange-cluster.png' },
  lemon:       { single: '/products/singles/lemon-single.png',       cluster: '/products/price-sheet/lemon-cluster.png' },
  lime:        { single: '/products/singles/lime-single.png',        cluster: '/products/price-sheet/lime-cluster.png' },
  avocado:     { single: '/products/singles/avocado-single.png',     cluster: '/products/price-sheet/avocado-cluster.png' },
  strawberry:  { single: '/products/singles/strawberry-single.png',  cluster: '/products/price-sheet/strawberry-cluster.png' },
  broccoli:    { single: '/products/singles/broccoli-single.png',    cluster: '/products/price-sheet/broccoli-cluster.png' },
  'bell pepper': { single: '/products/singles/bell-pepper-single.png', cluster: '/products/price-sheet/bell-pepper-cluster.png' },
  pineapple:   { single: '/products/singles/pineapple-single.png',   cluster: '/products/price-sheet/pineapple-cluster.png' },
};

// Decorative image for the CTA/footer area only — never assigned to a
// specific commodity row.
export const PRODUCE_CRATE_IMAGE = '/products/price-sheet/produce-crate.png';

// Common naming variations that should resolve to the same entry above.
// Add new aliases here — never duplicate an image path in a second place.
const ALIASES = {
  oranges: 'orange',
  lemons: 'lemon',
  limes: 'lime',
  avocados: 'avocado',
  strawberries: 'strawberry',
  'bell peppers': 'bell pepper',
  'colored bell peppers': 'bell pepper',
  'colored bell pepper': 'bell pepper',
  pineapples: 'pineapple',
};

function normalize(commodity) {
  if (!commodity) return null;
  // "Bell Peppers – Red XL" -> "bell peppers" (strip anything after a dash)
  let key = commodity.trim().toLowerCase().split(/[-–—]/)[0].trim();
  if (IMAGE_MAP[key]) return key;
  if (ALIASES[key]) return ALIASES[key];
  // simple plural fallback
  const singular = key.endsWith('s') ? key.slice(0, -1) : key;
  if (IMAGE_MAP[singular]) return singular;
  if (ALIASES[singular]) return ALIASES[singular];
  return null;
}

// For the customer-facing Price Sheet. Falls back to the single image if
// no cluster image is mapped; returns null (never a broken-image path) if
// the commodity isn't recognized at all.
export function getClusterImage(commodity) {
  const key = normalize(commodity);
  if (!key) return null;
  return IMAGE_MAP[key].cluster || IMAGE_MAP[key].single || null;
}

// For internal use later (Product Master, product cards, etc.) — set up
// now per the request, not yet wired into any internal page.
export function getSingleImage(commodity) {
  const key = normalize(commodity);
  if (!key) return null;
  return IMAGE_MAP[key].single || null;
}
