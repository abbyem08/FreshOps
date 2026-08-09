// pages/app/prospects.js
// Not part of the current FreshOps workflow (no nav entry, no connected
// data flow). Redirecting to Dashboard rather than deleting, per the
// Product Bible's "prefer archive over deletion."
export async function getServerSideProps() {
  return { redirect: { destination: '/app/dashboard', permanent: false } };
}
export default function ProspectsRedirect() { return null; }
