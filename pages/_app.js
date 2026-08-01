// pages/_app.js
// Required by Next.js to load global CSS (the brand color variables).
// Also registers the service worker so FreshOps can be installed as an app.
import { useEffect } from 'react';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return <Component {...pageProps} />;
}
