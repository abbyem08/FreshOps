// pages/index.js
// Nothing lives at the bare homepage — send visitors straight to login.
export default function Home() {
  return null;
}

export async function getServerSideProps() {
  return {
    redirect: {
      destination: '/portal/login',
      permanent: false,
    },
  };
}
