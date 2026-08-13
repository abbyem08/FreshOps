// lib/productImages.js
//
// ONE centralized commodity -> image mapping. Product photos are static
// files in /public/products, not database-backed (intentional — the image
// is generic per commodity right now, not supplier/variety-specific; see
// FRESHOPS_PRODUCT_BIBLE.md if that ever changes).
//
// Never hard-code an image path in a page. Always go through
// getClusterImage() / getSingleImage() below, so every page agrees on the
// same mapping and the same fallback behavior.
//
// Standard internal icon sizes — pick one of these rather than inventing a
// new pixel value per page:
//   TINY     28-36px  — table rows, order lines, logistics lines
//   STANDARD 48-64px  — Jacket cards, Ordering Needs, Market Calls
//   FEATURE  80-110px — Jacket Product cards, Product Master
export const ICON_SIZE = { tiny: 32, standard: 56, feature: 96 };

const IMAGE_MAP = {
  orange:       { single: '/products/singles/orange-single.png',       cluster: '/products/price-sheet/orange-cluster.png' },
  lemon:        { single: '/products/singles/lemon-single.png',        cluster: '/products/price-sheet/lemon-cluster.png' },
  lime:         { single: '/products/singles/lime-single.png',         cluster: '/products/price-sheet/lime-cluster.png' },
  avocado:      { single: '/products/singles/avocado-single.png',      cluster: '/products/price-sheet/avocado-cluster.png' },
  strawberry:   { single: '/products/singles/strawberry-single.png',   cluster: '/products/price-sheet/strawberry-cluster.png' },
  broccoli:     { single: '/products/singles/broccoli-single.png',     cluster: '/products/price-sheet/broccoli-cluster.png' },
  'bell pepper': { single: '/products/singles/bell-pepper-single.png', cluster: '/products/price-sheet/bell-pepper-cluster.png' },
  pineapple:    { single: '/products/singles/pineapple-single.png',    cluster: '/products/price-sheet/pineapple-cluster.png' },
  iceberg:      { single: '/products/singles/iceberg-single.png',      cluster: '/products/price-sheet/iceberg-cluster.png' },
  'green onion': { single: '/products/singles/green-onion-single.png', cluster: '/products/price-sheet/green-onion-cluster.png' },
  celery:       { single: '/products/singles/celery-single.png',       cluster: '/products/price-sheet/celery-cluster.png' },
  romaine:      { single: '/products/singles/romaine-single.png',      cluster: '/products/price-sheet/romaine-cluster.png' },

  artichoke:          { single: '/products/singles/artichoke-single.png',          cluster: '/products/price-sheet/artichoke-cluster.png' },
  'broccoli rabe':    { single: '/products/singles/broccoli-rabe-single.png',      cluster: '/products/price-sheet/broccoli-rabe-cluster.png' },
  'baby arugula':     { single: '/products/singles/arugula-single.png',            cluster: '/products/price-sheet/baby-arugula-cluster.png' },
  blackberry:         { single: '/products/singles/blackberry-single.png',         cluster: '/products/price-sheet/blackberry-cluster.png' },
  blueberry:          { single: '/products/singles/blueberry-single.png',          cluster: '/products/price-sheet/blueberry-cluster.png' },
  'bok choy':          { single: '/products/singles/bok-choy-single.png',          cluster: '/products/price-sheet/bok-choy-cluster.png' },
  broccolini:         { single: '/products/singles/broccolini-single.png',         cluster: '/products/price-sheet/broccolini-cluster.png' },
  'brussels sprouts':  { single: '/products/singles/brussels-sprout-single.png',   cluster: '/products/price-sheet/brussels-sprouts-cluster.png' },
  cauliflower:        { single: '/products/singles/cauliflower-single.png',        cluster: '/products/price-sheet/cauliflower-cluster.png' },
  cilantro:           { single: '/products/singles/cilantro-single.png',           cluster: '/products/price-sheet/cilantro-cluster.png' },
  'curly parsley':     { single: '/products/singles/curly-parsley-single.png',     cluster: '/products/price-sheet/curly-parsley-cluster.png' },
  eggplant:           { single: '/products/singles/eggplant-single.png',           cluster: '/products/price-sheet/eggplant-cluster.png' },
  endive:             { single: '/products/singles/endive-single.png',             cluster: '/products/price-sheet/endive-cluster.png' },
  escarole:           { single: '/products/singles/escarole-single.png',           cluster: '/products/price-sheet/escarole-cluster.png' },
  fennel:             { single: '/products/singles/fennel-single.png',             cluster: '/products/price-sheet/fennel-cluster.png' },
  grapefruit:         { single: '/products/singles/grapefruit-single.png',         cluster: '/products/price-sheet/grapefruit-cluster.png' },
  grapes:             { single: '/products/singles/grapes-single.png',             cluster: '/products/price-sheet/grapes-cluster.png' },
  'green leaf':        { single: '/products/singles/green-leaf-single.png',        cluster: '/products/price-sheet/green-leaf-cluster.png' },
  'italian parsley':   { single: '/products/singles/italian-parsley-single.png',   cluster: '/products/price-sheet/italian-parsley-cluster.png' },
  kale:               { single: '/products/singles/kale-single.png',               cluster: '/products/price-sheet/kale-cluster.png' },
  leek:               { single: '/products/singles/leek-single.png',               cluster: '/products/price-sheet/leek-cluster.png' },
  mandarin:           { single: '/products/singles/mandarin-single.png',           cluster: '/products/price-sheet/mandarin-cluster.png' },
  'napa cabbage':      { single: '/products/singles/napa-cabbage-single.png',      cluster: '/products/price-sheet/napa-cabbage-cluster.png' },
  raspberry:          { single: '/products/singles/raspberry-single.png',          cluster: '/products/price-sheet/raspberry-cluster.png' },
  'red leaf':          { single: '/products/singles/red-leaf-single.png',          cluster: '/products/price-sheet/red-leaf-cluster.png' },
  spinach:            { single: '/products/singles/spinach-single.png',            cluster: '/products/price-sheet/spinach-cluster.png' },
  'spring mix':        { single: '/products/singles/spring-mix-single.png',        cluster: '/products/price-sheet/spring-mix-cluster.png' },
  'yellow squash':     { single: '/products/singles/yellow-squash-single.png',     cluster: '/products/price-sheet/yellow-squash-cluster.png' },
  zucchini:           { single: '/products/singles/zucchini-single.png',           cluster: '/products/price-sheet/zucchini-cluster.png' },
  cantaloupe:         { single: '/products/singles/cantaloupe-single.png',         cluster: '/products/price-sheet/cantaloupe-cluster.png' },
  watermelon:         { single: '/products/singles/watermelon-single.png',         cluster: '/products/price-sheet/watermelon-cluster.png' },
  banana:             { single: '/products/singles/banana-single.png',             cluster: '/products/price-sheet/banana-cluster.png' },
  mango:              { single: '/products/singles/mango-single.png',              cluster: '/products/price-sheet/mango-cluster.png' },
};

// Decorative corner images for the customer-facing Price Sheet only — page
// framing, never assigned to a specific commodity row. Separate concept
// from the per-commodity IMAGE_MAP above — do not conflate the two.
export const DECORATIVE_IMAGES = {
  leaves: '/products/decorative/corner-leaf.png',
  lemon: '/products/decorative/corner-lemon-cluster.png',
  orange: '/products/decorative/corner-orange-cluster.png',
  strawberry: '/products/decorative/corner-strawberry-cluster.png',
  crate: '/products/decorative/corner-produce-crate.png',
  // Full standalone crate shot (not the cropped corner version above) — used
  // for the Customer Price Sheet CTA, where the complete crate needs to be
  // visible rather than acting as page-corner framing.
  crateFull: '/products/price-sheet/produce-crate.png',
};

// Common naming variations that resolve to the same entry above. Add new
// aliases here — never duplicate an image path in a second place. Keep
// these explicit rather than clever: an algorithm that "derives" romaine
// from "hearts" risks merging genuinely different commodities together.
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
  'iceberg wrap': 'iceberg',
  'iceberg liner': 'iceberg',
  'romaine hearts': 'romaine',
  'romaine liner': 'romaine',
  'green onions': 'green onion',
  celeries: 'celery',
  // real Product Master typo — cannot rename the source data, so the
  // misspelling gets its own alias pointing at the correct image
  'baby agrugula': 'baby arugula',
  napa: 'napa cabbage',
  'zucchini squash': 'zucchini',
  blackberries: 'blackberry',
  blueberries: 'blueberry',
  raspberries: 'raspberry',
  mandarins: 'mandarin',
  mangoes: 'mango',
  mangos: 'mango',
  bananas: 'banana',
  grape: 'grapes',
  'red grapes': 'grapes',
  'green grapes': 'grapes',
  // real Product Master shorthand/singular names that don't match the
  // IMAGE_MAP key on their own
  'broc rabe': 'broccoli rabe',
  'brussel sprout': 'brussels sprouts',
};

// Packaging/marketing words AND pack-size units, stripped only from the
// END of the name, in a loop, along with bare numbers — so "Broccoli 14
// ct" and "Broccoli Crown" both reduce down to "broccoli" without needing
// a separate image or Product Master rename for every pack configuration.
const TRAILING_NOISE_WORDS = ['iced', 'icls', 'nkd', 'slvd', 'wrap', 'liner', 'crown', 'hearts'];
const UNIT_WORDS = ['ct', 'cs', 'lb', 'lbs', 'oz', 'pk', 'bg', 'bag', 'ctn'];

function stripParenthetical(s) {
  // "Broccoli (ICED)" -> "Broccoli"
  return s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripTrailingModifiers(key) {
  const words = key.split(' ');
  while (words.length > 1) {
    const last = words[words.length - 1];
    const isNoise = TRAILING_NOISE_WORDS.includes(last);
    const isUnit = UNIT_WORDS.includes(last);
    const isNumber = /^\d+$/.test(last);
    if (isNoise || isUnit || isNumber) { words.pop(); continue; }
    break;
  }
  return words.join(' ');
}

function normalize(commodity) {
  if (!commodity) return null;
  let key = commodity.trim().toLowerCase();
  key = stripParenthetical(key);
  // "Bell Peppers – Red XL" -> "bell peppers" (strip anything after a dash)
  key = key.split(/[-–—]/)[0].trim();
  if (IMAGE_MAP[key]) return key;
  if (ALIASES[key]) return ALIASES[key];

  const stripped = stripTrailingModifiers(key);
  if (IMAGE_MAP[stripped]) return stripped;
  if (ALIASES[stripped]) return ALIASES[stripped];

  // simple plural fallback, tried last
  const singular = stripped.endsWith('s') ? stripped.slice(0, -1) : stripped;
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

// For internal FreshOps use — Jacket Products, Product Master, Ordering
// Needs, Market Calls, etc.
export function getSingleImage(commodity) {
  const key = normalize(commodity);
  if (!key) return null;
  return IMAGE_MAP[key].single || null;
}
