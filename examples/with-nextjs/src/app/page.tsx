import dynamic from "next/dynamic";
import Script from "next/script";

import "../common.scss";

// Since client components get prerenderd on server as well hence importing the drawboard stuff dynamically
// with ssr false
const DrawboardWithClientOnly = dynamic(
  async () => (await import("../drawboardWrapper")).default,
  {
    ssr: false,
  },
);

export default function Page() {
  return (
    <>
      <a href="/drawboard-in-pages">Switch to Pages router</a>
      <h1 className="page-title">App Router</h1>
      <Script id="load-env-variables" strategy="beforeInteractive">
        {`window["DRAWBOARD_ASSET_PATH"] = window.origin;`}
      </Script>
      {/* @ts-expect-error - https://github.com/vercel/next.js/issues/42292 */}
      <DrawboardWithClientOnly />
    </>
  );
}
