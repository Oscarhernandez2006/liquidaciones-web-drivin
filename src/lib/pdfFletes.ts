import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Flete } from "@/lib/tipos";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Número de semana ISO 8601 a partir de una fecha YYYY-MM-DD. */
function semanaISO(fechaISO: string): number {
  const d = new Date(fechaISO + "T00:00:00");
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const primerJueves = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((primerJueves - target.valueOf()) / 604800000);
}

function mesDe(fechaISO: string): string {
  return MESES[Number(fechaISO.slice(5, 7)) - 1] ?? "";
}

const fmt = (n: number, dec = 0) =>
  new Intl.NumberFormat("es-CO", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n);

/** Genera y descarga un PDF informativo con los fletes del día. */
export function generarPdfFletesDiarios(fletes: Flete[], nombre: string, placa: string): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const hoy = new Date();
  const fechaLarga = hoy.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const fechaCorta = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;

  // Banda de encabezado corporativa.
  doc.setFillColor(18, 24, 40); // drivin dark
  doc.rect(0, 0, pageWidth, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Fletes diarios", 40, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(fechaLarga, 40, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${nombre} · ${placa}`, pageWidth - 40, 40, { align: "right" });

  const totalKilos = fletes.reduce((a, f) => a + f.kilos, 0);
  const totalKm = fletes.reduce((a, f) => a + (f.kilometros ?? 0), 0);

  autoTable(doc, {
    startY: 84,
    head: [
      [
        "#",
        "Código",
        "Fecha",
        "PDV Origen",
        "Cliente Destino",
        "Descripción",
        "Kilos",
        "Km",
        "Mes",
        "Año",
        "Sem.",
      ],
    ],
    body: fletes.map((f, i) => [
      f.numero || i + 1,
      f.codigo,
      f.fecha,
      f.origen,
      f.destino,
      f.descripcion,
      fmt(f.kilos, f.kilos % 1 === 0 ? 0 : 2),
      f.kilometros != null ? fmt(f.kilometros, 2) : "—",
      mesDe(f.fecha),
      f.fecha.slice(0, 4),
      semanaISO(f.fecha),
    ]),
    styles: { fontSize: 8, cellPadding: 4, valign: "middle", overflow: "linebreak" },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: 60 },
      2: { cellWidth: 56 },
      5: { cellWidth: 180 },
      6: { halign: "right", cellWidth: 42 },
      7: { halign: "right", cellWidth: 42 },
      8: { cellWidth: 56 },
      9: { cellWidth: 40, halign: "center" },
      10: { cellWidth: 32, halign: "center" },
    },
    margin: { left: 40, right: 40 },
  });

  // Totales al pie de la tabla.
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 24, 39);
  doc.text(
    `Total fletes: ${fletes.length}     Total kilos: ${fmt(totalKilos, 2)}     Total km: ${fmt(
      totalKm,
      2
    )}`,
    40,
    finalY + 22
  );

  doc.save(`Fletes diarios ${fechaCorta}.pdf`);
}
