// pages/_document.js
// Sets the browser tab icon (favicon) site-wide using the real logo mark.
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/brand/favicon-32.png" sizes="32x32" />
        <link rel="icon" href="/brand/favicon-64.png" sizes="64x64" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
