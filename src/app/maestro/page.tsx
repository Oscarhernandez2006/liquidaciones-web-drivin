import Header from "@/components/Header";
import MaestroPortal from "@/components/MaestroPortal";

// No cachear el HTML (mismos motivos que la home).
export const dynamic = "force-dynamic";

export default function MaestroPage() {
  return (
    <main className="min-h-screen">
      <Header />

      <div className="bg-marca pb-24 pt-8 text-center">
        <h1 className="px-5 text-2xl font-bold text-white sm:text-3xl">Acceso maestro</h1>
        <p className="mx-auto mt-2 max-w-xl px-5 text-sm text-blue-100">
          Consulta la liquidación de cualquier domiciliario publicado.
        </p>
      </div>

      <div className="mx-auto -mt-16 max-w-5xl px-5 pb-16">
        <MaestroPortal />
      </div>
    </main>
  );
}
