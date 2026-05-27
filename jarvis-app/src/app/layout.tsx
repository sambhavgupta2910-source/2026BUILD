import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "JARVIS — Sambhav OS",
  description: "AI Operating System. Notion Brain. Zero latency.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "JARVIS",
  },
  icons: {
    icon: "/jarvis-icon.svg",
    apple: "/jarvis-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#050508",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistMono.variable} antialiased overflow-hidden`}
        style={{ background: "var(--j-black)", color: "var(--j-text-hi)" }}
      >
        {children}
      </body>
    </html>
  );
}
