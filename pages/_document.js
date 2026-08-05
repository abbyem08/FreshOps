// pages/_document.js
// Sets the browser tab icon (favicon) site-wide using the real logo mark,
// plus everything needed for FreshOps to be installable as an app.
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/brand/favicon-32.png" sizes="32x32" />
        <link rel="icon" href="/brand/favicon-64.png" sizes="64x64" />

        {/* PWA: installable app support */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#214B34" />
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FreshOps" />
        <meta name="mobile-web-app-capable" content="yes" />
      </Head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (localStorage.getItem('fo-theme-preview') === 'dark') {
              document.documentElement.classList.add('theme-dark');
            }
          } catch (e) {}
        ` }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
