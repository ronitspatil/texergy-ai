/** Parsing for Smart Meter Texas interval exports.
 *
 *  Lives here rather than in the component that renders the file input because
 *  the upload is offered inside the profile step's usage field, and the parser
 *  has no UI concerns of its own. Everything runs in the browser — the raw file
 *  is never sent anywhere.
 */

export type ParsedMeterData = {
  monthlyAvgKwh: number;
  daysCovered: number;
  monthsCovered: number;
  totalKwh: number;
  earliest: string | null;
  latest: string | null;
};

/* ------------------------------------------------------------------ */
/* CSV parsing                                                        */
/* ------------------------------------------------------------------ */

/** Parse a Smart Meter Texas IntervalData.csv. Looks for a column whose name
 *  contains "kwh" (usage) and one containing "date", sums kWh per day, and
 *  computes a monthly average over the days covered. Robust to header-row
 *  position (some SMT exports prepend a metadata block before the real CSV
 *  header) and to quoted values. */
export function parseSmtCsv(text: string): ParsedMeterData {
  const allLines = text.split(/\r?\n/);

  // Find the header line. SMT exports sometimes have a metadata preamble; the
  // real header is the first line that contains the substring "kwh" (case-
  // insensitive). Fall back to the first line.
  let headerIdx = allLines.findIndex((l) => /kwh/i.test(l));
  if (headerIdx < 0) headerIdx = 0;

  const headers = splitCsvLine(allLines[headerIdx] ?? "");
  const lcHeaders = headers.map((h) => h.toLowerCase());

  const kwhCol = findColumn(lcHeaders, [
    (h) => h.includes("usage") && h.includes("kwh"),
    (h) => h === "kwh" || h.endsWith(" kwh") || h.includes("(kwh)"),
    (h) => h.includes("consumption"),
    (h) => h.includes("kwh"),
  ]);
  const dateCol = findColumn(lcHeaders, [
    (h) => h.includes("usage") && h.includes("date"),
    (h) => h.includes("date"),
    (h) => h.includes("read") && h.includes("date"),
  ]);

  if (kwhCol < 0) {
    return { monthlyAvgKwh: 0, daysCovered: 0, monthsCovered: 0, totalKwh: 0, earliest: null, latest: null };
  }

  const perDay = new Map<string, number>();
  let totalKwh = 0;

  for (let i = headerIdx + 1; i < allLines.length; i++) {
    const raw = allLines[i];
    if (!raw || !raw.trim()) continue;
    const cols = splitCsvLine(raw);
    const kwhStr = cols[kwhCol] ?? "";
    const kwh = Number.parseFloat(kwhStr.replace(/[",]/g, ""));
    if (!Number.isFinite(kwh)) continue;
    totalKwh += kwh;

    if (dateCol >= 0) {
      const dateStr = normalizeDate(cols[dateCol] ?? "");
      if (dateStr) {
        perDay.set(dateStr, (perDay.get(dateStr) ?? 0) + kwh);
      }
    }
  }

  const days = [...perDay.keys()].sort();
  const daysCovered = days.length;
  const earliest = days[0] ?? null;
  const latest = days[days.length - 1] ?? null;
  // 30.4 ≈ avg days/month — better than 30 over 13-month windows.
  const monthlyAvgKwh = daysCovered > 0 ? (totalKwh / daysCovered) * 30.4 : 0;
  const monthsCovered = daysCovered > 0 ? daysCovered / 30.4 : 0;

  return { monthlyAvgKwh, daysCovered, monthsCovered, totalKwh, earliest, latest };
}

function findColumn(lcHeaders: string[], matchers: ((h: string) => boolean)[]): number {
  for (const m of matchers) {
    const idx = lcHeaders.findIndex(m);
    if (idx >= 0) return idx;
  }
  return -1;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      current += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

/** Normalize a date string to yyyy-mm-dd. Handles m/d/yyyy, mm/dd/yyyy,
 *  yyyy-mm-dd, and yyyy-mm-ddThh:mm:ss. Returns null when it can't parse. */
function normalizeDate(raw: string): string | null {
  const s = raw.trim().replace(/^"+|"+$/g, "");
  if (!s) return null;
  // ISO-ish
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  // mm/dd/yyyy
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    const yyyy = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${yyyy}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }
  return null;
}
