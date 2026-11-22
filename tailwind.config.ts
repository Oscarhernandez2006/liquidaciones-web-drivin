import type { Config } from "tailwindcss";

// Paleta tomada del aplicativo WPF (Themes/Tema.xaml): superficies claras y azul de marca.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        drivin: {
          // Azul de marca del aplicativo (ColorMarca / Marca700 / Marca900).
          indigo: "#2563EB",
          indigoDark: "#1D4ED8",
          marca50: "#EFF6FF",
          marca100: "#DBEAFE",
          marca200: "#BFDBFE",
          marca900: "#1E40AF",
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
      backgroundImage: {
        // Degradado del encabezado del login del aplicativo.
        marca: "linear-gradient(135deg, #1E40AF 0%, #2563EB 55%, #3B82F6 100%)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Segoe UI", "system-ui", "Arial", "sans-serif"],
      },
      boxShadow: {
        tarjeta: "0 1px 2px rgba(16,24,40,0.04), 0 4px 14px rgba(16,24,40,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;