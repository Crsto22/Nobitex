import type { Metadata, Viewport } from "next";
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
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#101D69",
};

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
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
