import type { LiquidacionDetalle } from "@/lib/tipos";
import { moneda, numero } from "@/lib/formato";
import Badge from "./Badge";
import MetricaChip from "./MetricaChip";
import SeccionConceptos from "./SeccionConceptos";
import BotonImprimir from "./BotonImprimir";

/** Recibo/desprendible de liquidación de un domiciliario. */
export default function ReciboLiquidacion({ detalle }: { detalle: LiquidacionDetalle }) {
  const { domiciliario, fila } = detalle;

  return (
    <div className="print-full overflow-hidden rounded-xl border border-drivin-border bg-white shadow-tarjeta">
      {/* Cabecera */}
      <div className="border-b border-drivin-border bg-drivin-bg px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-drivin-ink">{domiciliario.nombre}</h1>
            <p className="mt-1 text-sm text-drivin-muted">
              Código: <span className="font-semibold text-drivin-ink">{domiciliario.codigoVehiculo}</span>
              {domiciliario.pdv && (
                <>
                  {"  ·  "}PDV: <span className="font-semibold text-drivin-ink">{domiciliario.pdv}</span>
                </>
              )}
            </p>
          </div>
          <Badge cumple={detalle.cumple} texto={detalle.estadoCumple} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded bg-drivin-indigo/10 px-3 py-1 text-sm font-semibold text-drivin-indigoDark">
            {detalle.periodoEtiqueta}
          </span>
          <span className="rounded bg-white px-3 py-1 text-sm font-medium text-drivin-muted ring-1 ring-drivin-border">
            {detalle.rangoFechas}
          </span>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 px-6 py-5 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2 print:px-4 print:py-3">
        <MetricaChip etiqueta="Pedidos" valor={numero(fila.pedidos)} />
        <MetricaChip etiqueta="Run Errands" valor={numero(fila.runErrands)} />
        <MetricaChip etiqueta="Fuera de rango" valor={numero(fila.fueraRango)} />
        <MetricaChip etiqueta="No confirmados" valor={numero(fila.noConfirmados)} />
        <MetricaChip etiqueta="Kilómetros" valor={numero(fila.kilometros, 1)} />
      </div>

      {/* Conceptos por sección */}
      <div className="grid gap-4 px-6 pb-6 lg:grid-cols-3 print:grid-cols-3 print:gap-2">
        <SeccionConceptos
          titulo="Conceptos fijos"
          tono="fijos"
          conceptos={[
            { label: "Gasolina", valor: fila.gasolina },
            { label: "Rodamiento", valor: fila.rodamiento },
            { label: "Uso celular", valor: fila.usoCelular },
          ]}
        />
        <SeccionConceptos
          titulo="Run Errands"
          tono="run"
          conceptos={[{ label: "Run Errands", valor: fila.runErrandsMonto }]}
        />
        <SeccionConceptos
          titulo="Conceptos variables"
          tono="varsec"
          conceptos={[
            { label: "Variable pedidos", valor: fila.variablePedido },
            { label: "Variable kilómetros", valor: fila.variableKm },
          ]}
        />
      </div>

      {/* Total */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-drivin-ink px-6 py-5 print:justify-end">
        <div className="print:text-right">
          <div className="text-xs font-medium uppercase tracking-wide text-white/60">
            Liquidación total
          </div>
          <div className="text-3xl font-extrabold text-white">{moneda(detalle.total)}</div>
        </div>
        <BotonImprimir />
      </div>
    </div>
  );
}
