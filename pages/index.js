// pages/index.js
// Visiting the bare site address (no /login or /portal/login) now lands
// here first, and immediately sends you to staff login. This is a
// server-side redirect, so there's no flash of a blank page first.

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/login',
      permanent: false,
    },
  };
}

export default function Index() {
  return null;
}
