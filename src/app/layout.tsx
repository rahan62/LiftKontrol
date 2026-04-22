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
  title: "Lift Kontrol — asansör saha servisi",
  description:
    "Asansör bakım, onarım ve montaj operasyonları için Lift Kontrol: müşteriler, sahalar, bakım ve saha ekipleri.",
  metadataBase: new URL("https://liftkontrol.com"),
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
        {/*
          Lock document scroll: embedded WebViews may scroll the document; inner panes use overflow-y-auto.
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </body>
    </html>
  );
}
