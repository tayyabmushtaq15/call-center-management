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
  title: "Local Presence Dialing",
  description: "Call center local presence DID management",
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
        className="min-h-full flex flex-col font-sans bg-slate-950 text-slate-200 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
