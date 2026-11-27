import Header from "@/components/Header";
import ConsultaForm from "@/components/ConsultaForm";

// El HTML no debe cachearse en CDN/navegador: cada deploy cambia los chunks y
// un HTML viejo cacheado apuntaría a assets inexistentes (404 para todos).
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />

      {/* Encabezado con acento de marca */}
      <div className="bg-marca pb-10 pt-5 text-center sm:pb-12 sm:pt-8">
        <h1 className="px-5 text-xl font-bold text-white sm:text-3xl">
          Tu liquidación de incentivos, siempre a la mano
        </h1>
        <p className="mx-auto mt-1 max-w-xl px-5 text-xs text-blue-100 sm:mt-2 sm:text-sm">
          Consulta y descarga el detalle de tus pagos por período.
        </p>
      </div>

      {/* Formulario superpuesto */}
      <div className="mx-auto -mt-8 max-w-5xl px-3 pb-10 sm:px-5 sm:pb-16">
        <ConsultaForm />
      </div>
    </main>
  );
}
