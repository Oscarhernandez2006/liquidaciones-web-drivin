import Link from "next/link";

/** Barra superior oscura con el logo Drivin (patrón del aplicativo). */
export default function Header() {
  return (
    <header className="bg-drivin-dark no-print">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_drivin.png" alt="Drivin" className="h-9 w-auto" />
          <span className="hidden border-l border-white/15 pl-3 text-sm font-semibold text-white/70 sm:block">
            Portal de liquidaciones
          </span>
        </Link>
      </div>
    </header>
  );
}
