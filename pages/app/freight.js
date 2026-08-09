// pages/app/freight.js
// This standalone page predates the Jacket workspace's Logistics tab,
// which now owns all freight/dispatch functionality. Redirecting rather
// than deleting, per the Product Bible's "prefer archive over deletion."
export async function getServerSideProps() {
  return { redirect: { destination: '/app/jackets', permanent: false } };
}
export default function FreightRedirect() { return null; }
