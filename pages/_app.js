// pages/_app.js
// Required by Next.js to load global CSS (the brand color variables).
// This file didn't exist before — everything else about how pages render
// is unchanged.
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
