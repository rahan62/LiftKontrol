import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lift Kontrol — Platform",
  description: "Platform yönetimi",
  icons: {
    icon: [{ url: "/brand/lift-kontrol-logo.png", type: "image/png" }],
    apple: "/brand/lift-kontrol-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
