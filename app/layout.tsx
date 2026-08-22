import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nuvex",
  description: "Gestiona ventas, inventario y facturacion desde Nuvex.",
  applicationName: "Nuvex",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nuvex",
  },
  icons: {
    icon: "/Logo/Nuvex.ico",
    shortcut: "/Logo/Nuvex.ico",
    apple: "/Logo/logopwa.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#101D69",
};

const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const umamiScriptUrl =
  process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL ?? "https://cloud.umami.is/script.js";

const sidebarStateScript = `
  (function () {
    try {
      var collapsed = localStorage.getItem("sidebar-collapsed") === "true";
      var expandedSections = localStorage.getItem("sidebar-expanded-sections");
      document.documentElement.dataset.sidebarCollapsed = String(collapsed);

      if (expandedSections) {
        var parsed = JSON.parse(expandedSections);
        if (Array.isArray(parsed)) {
          document.documentElement.dataset.sidebarExpandedSections = parsed
            .filter(function (value) { return typeof value === "string"; })
            .join(" ");
        }
      }
    } catch (error) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarStateScript }} />
        {umamiWebsiteId && (
          <Script
            src={umamiScriptUrl}
            data-website-id={umamiWebsiteId}
            strategy="afterInteractive"
          />
        )}
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
