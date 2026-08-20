"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ReciboLiquidacion from "@/components/ReciboLiquidacion";
import OverlayCargando from "@/components/OverlayCargando";
import type { LiquidacionDetalle } from "@/lib/tipos";
import { obtenerSesion } from "@/lib/sesion";

type Estado = "cargando" | "ok" | "sin-credenciales" | "no-encontrado" | "error";

export default function DetalleLiquidacionPage({ params }: { params: { id: string } }) {
  const [detalle, setDetalle] = useState<LiquidacionDetalle | null>(null);
  const [estado, setEstado] = useState<Estado>("cargando");

  useEffect(() => {
    const s = obtenerSesion();
    if (!s) {
      setEstado("sin-credenciales");
      return;
    }

    const url =
      `/api/liquidacion/${encodeURIComponent(params.id)}` +
      `?documento=${encodeURIComponent(s.documento)}&codigo=${encodeURIComponent(s.codigoVehiculo)}`;

    fetch(url)
      .then(async (res) => {
        if (res.status === 404) {
          setEstado("no-encontrado");
          return;
        }
        if (!res.ok) {
          setEstado("error");
          return;
        }
        setDetalle((await res.json()) as LiquidacionDetalle);
        setEstado("ok");
      })
      .catch(() => setEstado("error"));
  }, [params.id]);

  return (
    <main className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link
          href="/"
          className="no-print mb-4 inline-flex items-center gap-1 text-sm font-semibold text-drivin-indigoDark hover:underline"
        >
          ← Volver a mis liquidaciones
        </Link>

        {estado === "cargando" && <OverlayCargando mensaje="Cargando tu liquidación…" />}

        {estado === "ok" && detalle && <ReciboLiquidacion detalle={detalle} />}

        {estado === "sin-credenciales" && (
          <Aviso
            titulo="Necesitas identificarte"
            texto="Vuelve al inicio e ingresa tu documento y código de vehículo para ver tu liquidación."
          />
        )}
        {estado === "no-encontrado" && (
          <Aviso
            titulo="Liquidación no disponible"
            texto="No encontramos esta liquidación con tus datos. Verifica e inténtalo de nuevo."
          />
        )}
        {estado === "error" && (
          <Aviso titulo="Ocurrió un problema" texto="No pudimos cargar la liquidación. Intenta más tarde." />
        )}
      </div>
    </main>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-drivin-border bg-white p-8 text-center shadow-tarjeta">
      <p className="text-lg font-bold text-drivin-ink">{titulo}</p>
      <p className="mt-1 text-sm text-drivin-muted">{texto}</p>
      <Link
        href="/"
        className="mt-5 inline-block rounded-lg bg-drivin-indigo px-4 py-2 text-sm font-semibold text-white hover:bg-drivin-indigoDark"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
