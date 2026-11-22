import Link from "next/link";

/** Barra superior clara con los logos de Carnes Santacruz y Drivin (igual al menú del aplicativo). */
export default function Header() {
  return (
    <header className="no-print border-b border-drivin-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_carnes_santacruz.png" alt="Carnes Santacruz" className="h-10 w-auto" />
          <span className="text-sm font-semibold text-drivin-muted">×</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_drivin.png" alt="Drivin" className="h-8 w-auto" />
        </Link>
        <span className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 sm:ml-3">
          Portal de liquidaciones
        </span>
      </div>
    </header>
  );
}