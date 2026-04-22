import type { Metadata } from "next";
import { ExpoPathSync } from "@/components/expo-path-sync";
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
  title: "Asansör saha servisi",
  description:
    "Çok kiracılı asansör bakım, onarım ve montaj operasyonları için servis şirketleri.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh max-h-dvh overflow-hidden antialiased`}
    >
      <body className="flex h-dvh max-h-dvh flex-col overflow-hidden">
        <ExpoPathSync />
        {/*
          Lock document scroll: WKWebView (Expo) scrolls the whole document by default; that outer
          scroll layer can intercept taps on the app chrome header. Inner panes use overflow-y-auto.
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
