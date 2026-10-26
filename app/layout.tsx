import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SYMBO DID Portal",
  description: "SYMBO DID Portal: manage DIDs and call centers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: extensions (e.g. Grammarly) inject attributes on <body> */}
      <body
        className="min-h-full flex flex-col font-sans bg-[#f4f9f5] text-slate-800 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
