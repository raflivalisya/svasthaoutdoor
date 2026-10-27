import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Svastha Outdoor | Sewa Peralatan Gunung Lampung",
  description: "Sewa perlengkapan outdoor yang terawat di Kemiling dan Natar, Lampung.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
