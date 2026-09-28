"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { guardarSesionMaestra } from "@/lib/maestroSesion";

export default function SsoCallbackPage() {
  return (
    <Suspense fallback={<SsoCallbackCard error={null} onGoLogin={() => {}} />}>
      <SsoCallbackContent />
    </Suspense>
  );
}

function SsoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const ticket = searchParams.get("ticket")?.trim() || "";
      if (!ticket) {
        setError("No se recibió un ticket SSO válido.");
        return;
      }

      try {
        const res = await fetch("/api/maestro/sso-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        });

        const data = (await res.json().catch(() => ({}))) as {
          token?: string;
          nombre?: string;
          error?: string;
        };

        if (!res.ok || !data.token) {
          setError(data.error || "No fue posible iniciar sesión con SSO.");
          return;
        }

        if (cancelled) return;
        guardarSesionMaestra(data.token, data.nombre || "");
        router.replace("/maestro");
      } catch {
        if (cancelled) return;
        setError("No fue posible iniciar sesión con SSO.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <SsoCallbackCard error={error} onGoLogin={() => router.replace("/maestro")} />;
}

function SsoCallbackCard({
  error,
  onGoLogin,
}: {
  error: string | null;
  onGoLogin: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-drivin-bg px-6">
      <div className="w-full max-w-md rounded-xl border border-drivin-border bg-white p-6 shadow-tarjeta">
        <h1 className="text-lg font-bold text-drivin-ink">Acceso desde Suite Santacruz</h1>

        {!error ? (
          <div className="mt-4 flex items-center gap-3 text-sm text-drivin-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-drivin-border border-t-drivin-indigo" />
            Validando ticket de acceso...
          </div>
        ) : (
          <>
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={onGoLogin}
              className="mt-4 rounded-lg bg-drivin-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-drivin-indigoDark"
            >
              Ir al portal maestro
            </button>
          </>
        )}
      </div>
    </main>
  );
}
