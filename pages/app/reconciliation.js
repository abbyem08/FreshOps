// pages/app/reconciliation.js
// This standalone page predates the current Purchased Product / allocation
// model, which now shows Available quantity live on the Jacket Products
// tab. Redirecting rather than deleting, per the Product Bible's
// "prefer archive over deletion."
export async function getServerSideProps() {
  return { redirect: { destination: '/app/jackets', permanent: false } };
}
export default function ReconciliationRedirect() { return null; }
