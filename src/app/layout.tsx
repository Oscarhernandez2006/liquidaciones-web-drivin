import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liquidaciones · Drivin",
  description: "Portal para que los domiciliarios consulten su liquidación de incentivos.",
  icons: { icon: "/logo_drivin.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-drivin-bg text-drivin-ink antialiased">{children}</body>
    </html>
  );
}
