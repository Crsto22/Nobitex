import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const circularXSub = localFont({
  src: [
    {
      path: "../public/font/CircularXXSub-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/font/CircularXXSub-Bold.woff",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/font/CircularXXSub-Black.woff",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-circular-x-sub",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

const raleway = localFont({
  src: [
    {
      path: "../public/font/RalewayThin-SemiBold_3.woff2",
      weight: "100 600",
      style: "normal",
    },
  ],
  variable: "--font-raleway",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Nobitex",
  icons: {
    icon: "/Logo/NovitexIco.ico",
    shortcut: "/Logo/NovitexIco.ico",
    apple: "/Logo/NovitexIco.ico",
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
    <html
      lang="es"
      className={`${circularXSub.variable} ${raleway.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: sidebarStateScript }} />
      </head>
      <body className={raleway.className}>{children}</body>
    </html>
  );
}
