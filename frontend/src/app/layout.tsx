import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { ReaderSettingsProvider } from "@/components/reader-settings-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yabai — read Japanese at your level",
  description:
    "A reader that scores every text against the words you already know, so you always read at the edge of what you understand.",
};

/* `viewport-fit=cover` lets the tab bar and sheets paint into the home-indicator
   area, which the safe-area insets then pad back. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ebddc5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;500;600;700&family=Zen+Maru+Gothic:wght@400;500;700&family=Shippori+Mincho:wght@400;600;800&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ReaderSettingsProvider>
          <AppShell>{children}</AppShell>
        </ReaderSettingsProvider>
      </body>
    </html>
  );
}
