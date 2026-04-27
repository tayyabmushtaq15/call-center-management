import Papa from "papaparse";
import * as XLSX from "xlsx";
import { collectPhonesToSet, extractPhonesFromPastedText } from "./extract-phones-for-import";

const EXCEL_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/wps-office.xlsx", // some browsers
]);

function isExcelName(name: string) {
  const n = name.toLowerCase();
  return n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".ods");
}

function isCsvName(name: string) {
  return name.toLowerCase().endsWith(".csv") || name.toLowerCase().endsWith(".tsv");
}

/**
 * Read phones from a CSV, TSV, or Excel (xlsx/xls) file for DID import.
 */
export async function extractPhonesFromDataFile(file: File): Promise<string[]> {
  const set = new Set<string>();
  const name = file.name.toLowerCase();
  const mime = (file.type || "").toLowerCase();

  if (isCsvName(name) || mime.includes("csv") || mime === "text/plain" || mime === "text/tab-separated-values") {
    const text = await file.text();
    const { data } = Papa.parse<unknown[]>(text, {
      header: false,
      skipEmptyLines: "greedy",
    });
    for (const row of data) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          collectPhonesToSet(set, cell);
        }
      } else {
        collectPhonesToSet(set, row);
      }
    }
    return Array.from(set);
  }

  if (isExcelName(name) || EXCEL_MIME.has(mime) || mime.includes("sheet")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellDates: false });
    for (const sn of wb.SheetNames) {
      const sheet = wb.Sheets[sn];
      if (!sheet) continue;
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
        // Raw numbers; collectPhonesToSet rounds 10/11 digit cells without scientific notation.
        raw: true,
      });
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        for (const cell of row) {
          collectPhonesToSet(set, cell);
        }
      }
    }
    return Array.from(set);
  }

  throw new Error("Unsupported file type. Use .csv, .tsv, .xls, or .xlsx");
}

export { extractPhonesFromPastedText };
