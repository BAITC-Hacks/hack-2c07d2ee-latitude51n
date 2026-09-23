import type { Metadata } from "next";
import { IBM_Plex_Sans, Unbounded } from "next/font/google";
import "./globals.css";

const display = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "QALA · Аким на 5 часов",
  description:
    "Симулятор управленческих решений: бюджет 100, пять мер, Astana Quality of Life Score.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${display.variable} ${plex.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
