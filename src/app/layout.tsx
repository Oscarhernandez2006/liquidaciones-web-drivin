import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Misma tipografía del aplicativo de escritorio.
const inter = localFont({
  src: [
    { path: "./fonts/Inter-Regular.ttf", weight: "400" },
    { path: "./fonts/Inter-Medium.ttf", weight: "500" },
    { path: "./fonts/Inter-SemiBold.ttf", weight: "600" },
    { path: "./fonts/Inter-Bold.ttf", weight: "700" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Liquidaciones · Drivin",
  description: "Portal para que los domiciliarios consulten su liquidación de incentivos.",
  icons: { icon: "/logo_drivin.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="bg-drivin-bg font-sans text-drivin-ink antialiased">{children}</body>
    </html>
  );
}
