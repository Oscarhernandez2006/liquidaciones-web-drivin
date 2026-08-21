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
      <div className="bg-drivin-dark pb-16 pt-8 text-center">
        <h1 className="px-5 text-2xl font-extrabold text-white sm:text-3xl">
          Tu liquidación de incentivos, siempre a la mano
        </h1>
        <p className="mx-auto mt-2 max-w-xl px-5 text-sm text-white/70">
          Consulta y descarga el detalle de tus pagos por período.
        </p>
      </div>

      {/* Formulario superpuesto */}
      <div className="mx-auto -mt-10 max-w-5xl px-5 pb-16">
        <ConsultaForm />
      </div>
    </main>
  );
}
