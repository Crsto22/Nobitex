import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AppProviders } from "@/components/app-providers";
import { MetaPixel } from "@/components/analytics/meta-pixel";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.nuvex.pe",
  ),
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
      document.documentElement.dataset.sidebarCollapsed = String(collapsed);
    } catch (error) {}
  })();
`;

const themeScript = `
  (function () {
    try {
      var theme = localStorage.getItem("${THEME_STORAGE_KEY}");
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (theme === "light") {
        document.documentElement.classList.remove("dark");
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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
        <MetaPixel />
      </body>
    </html>
  );
}
