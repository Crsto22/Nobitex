import type { Metadata } from "next";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nobitex",
  icons: {
    icon: "/Logo/Norvitex.ico",
    shortcut: "/Logo/Norvitex.ico",
    apple: "/Logo/Norvitex.ico",
  },
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
