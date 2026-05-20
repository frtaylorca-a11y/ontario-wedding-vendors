"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

const CONSENT_KEY = "owv_analytics_consent_v1";

/**
 * Loads the three trackers:
 *   - Microsoft Clarity — always (anonymized heatmaps, free, no cookie
 *     consent required in Canada for non-identifying use)
 *   - Google Analytics 4 — only after user accepts cookies
 *   - Meta Pixel       — only after user accepts cookies
 *
 * Each ID is optional — when an env var is absent the corresponding
 * script just doesn't render.
 */
export function AnalyticsLoaders({
  ga4Id,
  metaPixelId,
  clarityId,
}: {
  ga4Id?: string;
  metaPixelId?: string;
  clarityId?: string;
}) {
  const [consent, setConsent] = useState<"accepted" | "declined" | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (stored === "accepted" || stored === "declined") {
        setConsent(stored);
      }
    } catch { /* ignore */ }

    /* Listen for consent changes from the banner */
    function onConsentChange(e: Event) {
      const detail = (e as CustomEvent<{ value: "accepted" | "declined" }>).detail;
      if (detail?.value) setConsent(detail.value);
    }
    window.addEventListener("owv:consent", onConsentChange);
    return () => window.removeEventListener("owv:consent", onConsentChange);
  }, []);

  const allowProfiledAnalytics = consent === "accepted";

  return (
    <>
      {/* Microsoft Clarity — always on (anonymized) */}
      {clarityId && (
        <Script
          id="clarity-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityId}");
            `,
          }}
        />
      )}

      {/* Google Analytics 4 — only after consent */}
      {ga4Id && allowProfiledAnalytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                gtag('config', '${ga4Id}', { send_page_view: true });
              `,
            }}
          />
        </>
      )}

      {/* Meta Pixel — only after consent */}
      {metaPixelId && allowProfiledAnalytics && (
        <Script
          id="meta-pixel-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
              n.callMethod? n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}
