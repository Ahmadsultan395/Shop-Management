import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ReportExportMeta {
  shopName: string;
  reportTitle: string;
  filtersSummary: string; // e.g. "Supplier: ABC Supplier · Status: Pending"
  dateRangeLabel: string; // e.g. "01-01-2025 to 31-12-2025" or "All time"
}

function generatedAtLabel(): string {
  return new Date().toLocaleString("en-GB");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportReportToPdf(
  meta: ReportExportMeta,
  columns: string[],
  rows: (string | number)[][],
  totalsRow: (string | number)[],
  filename: string
) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(meta.shopName, 14, 15);
  doc.setFontSize(11);
  doc.text(meta.reportTitle, 14, 22);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(meta.dateRangeLabel, 14, 28);
  if (meta.filtersSummary) doc.text(meta.filtersSummary, 14, 33);

  autoTable(doc, {
    startY: 38,
    head: [columns],
    body: rows,
    foot: [totalsRow],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [43, 76, 92] }, // matches the ledger brand color
    footStyles: { fillColor: [243, 241, 234], textColor: 20, fontStyle: "bold" },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Generated ${generatedAtLabel()}`, 14, finalY + 8);

  doc.save(filename);
}

function buildSheet(
  meta: ReportExportMeta,
  columns: string[],
  rows: (string | number)[][],
  totalsRow: (string | number)[]
) {
  const aoa: (string | number)[][] = [
    [meta.shopName],
    [meta.reportTitle],
    [meta.dateRangeLabel],
    ...(meta.filtersSummary ? [[meta.filtersSummary]] : []),
    [],
    columns,
    ...rows,
    [],
    totalsRow,
    [],
    [`Generated ${generatedAtLabel()}`],
  ];
  return XLSX.utils.aoa_to_sheet(aoa);
}

export function exportReportToXlsx(
  meta: ReportExportMeta,
  columns: string[],
  rows: (string | number)[][],
  totalsRow: (string | number)[],
  filename: string
) {
  const sheet = buildSheet(meta, columns, rows, totalsRow);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Report");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    filename
  );
}

export function exportReportToCsv(
  meta: ReportExportMeta,
  columns: string[],
  rows: (string | number)[][],
  totalsRow: (string | number)[],
  filename: string
) {
  const sheet = buildSheet(meta, columns, rows, totalsRow);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}
