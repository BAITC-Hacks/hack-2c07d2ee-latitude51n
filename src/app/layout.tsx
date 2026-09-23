import type { Metadata, Viewport } from "next";
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

const DESCRIPTION =
  "Симулятор управленческих решений: бюджет 100, пять мер, пять районов Астаны и Astana Quality of Life Score.";

export const metadata: Metadata = {
  title: "Latitude 51 · Аким на 5 часов",
  description: DESCRIPTION,
  openGraph: {
    title: "Latitude 51 · Аким на 5 часов",
    description: DESCRIPTION,
    locale: "ru_RU",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#e8eef3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${display.variable} ${plex.variable} h-full`}>
      <body className="min-h-full antialiased">
        <a
          href="#main"
          className="sr-only rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Перейти к содержимому
        </a>
        {children}
      </body>
    </html>
  );
}
