import type { Config } from "tailwindcss";

// Paleta tomada del aplicativo WPF (patrón de diseño Drivin).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        drivin: {
          dark: "#121828", // barra/encabezado oscuro
          darker: "#0D1119",
          panel: "#1F2937", // hover del menú
          indigo: "#4F46E5", // acento de tarjetas
          indigoDark: "#4338CA",
          bg: "#F9FAFB", // fondo general
          border: "#E5E7EB",
          ink: "#111827", // texto principal
          muted: "#6B7280", // texto secundario
        },
        // Conceptos fijos (verde)
        fijos: { hdr: "#A7F3D0", txt: "#065F46", cell: "#ECFDF5" },
        // Run Errands (naranja)
        run: { hdr: "#FED7AA", txt: "#9A3412", cell: "#FFF7ED" },
        // Conceptos variables (azul)
        varsec: { hdr: "#BFDBFE", txt: "#1E40AF", cell: "#EFF6FF" },
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "Arial", "sans-serif"],
      },
      boxShadow: {
        tarjeta: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
