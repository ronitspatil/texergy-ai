"use client";

import { useState } from "react";
import { SectionLabel } from "@/components/ui/section-label";
import { WizardFooter } from "@/components/find/wizard-footer";

type Parsed = {
  monthlyAvgKwh: number;
  daysCovered: number;
  monthsCovered: number;
  totalKwh: number;
  earliest: string | null;
  latest: string | null;
};

export function UploadStep({
  monthlyUsageKwh,
  onParsed,
  onBack,
  onNext,
}: {
  monthlyUsageKwh: number;
  onParsed: (kwh: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setParsed(null);
    setFilename(file.name);
    setParsing(true);
    try {
      const text = await file.text();
      const result = parseSmtCsv(text);
      if (result.daysCovered === 0) {
        setError(
          "Couldn't read any usage rows from this file. Make sure it's the IntervalData.csv export from Smart Meter Texas.",
        );
        return;
      }
      setParsed(result);
      onParsed(Math.round(result.monthlyAvgKwh));
    } catch (e) {
      setError("Couldn't parse this file. Make sure it's a valid CSV.");
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <SectionLabel className="block mb-4">Bring your real usage</SectionLabel>
      <h2 className="font-[family-name:var(--font-bebas)] text-foreground text-[clamp(2.5rem,5vw,4rem)] leading-[0.95] tracking-tight mb-3">
        DROP IT <span className="text-accent">IN.</span>
      </h2>
      <p className="font-mono text-sm text-muted-foreground mb-10 max-w-2xl">
        Upload your <span className="text-foreground">IntervalData.csv</span> from Smart Meter
        Texas and Texergy ranks plans against your actual usage instead of a guess.
      </p>

      <ol className="space-y-6 mb-10 max-w-2xl">
        <li>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-2">
            1 / Get your meter data
          </div>
          <p className="font-mono text-sm text-foreground/80 leading-relaxed">
            Log in at{" "}
            <a
              href="https://smartmetertexas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-accent/60 underline-offset-2 hover:text-accent transition-colors"
            >
              smartmetertexas.com
            </a>
            , go to <span className="text-foreground">Data → Usage → Export</span>, and download{" "}
            <span className="text-foreground">IntervalData.csv</span>. It contains up to 13 months
            of 15-minute readings.
          </p>
        </li>
        <li>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent mb-2">
            2 / Drop it in here
          </div>
          <label
            htmlFor="smt-csv"
            className="block border border-dashed border-border hover:border-accent transition-colors p-6 cursor-pointer bg-card/30"
          >
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-foreground mb-1">
                  {filename ?? "Choose CSV file"}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  Parsed locally in your browser. We never upload the raw file.
                </div>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                Browse →
              </span>
            </div>
            <input
              id="smt-csv"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
        </li>
      </ol>

      {parsing && (
        <p className="font-mono text-xs text-muted-foreground mb-6">Reading file…</p>
      )}

      {error && (
        <div
          role="alert"
          className="mb-6 border border-destructive/50 bg-destructive/5 px-4 py-3 font-mono text-xs text-destructive"
        >
          {error}
        </div>
      )}

      {parsed && (
        <div className="mb-6 border-l-2 border-accent bg-background/60 px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-3">
            Parsed
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            <div>
              <dt className="text-muted-foreground mb-1">Monthly avg</dt>
              <dd className="text-foreground text-lg font-[family-name:var(--font-bebas)] tracking-tight">
                {Math.round(parsed.monthlyAvgKwh).toLocaleString()} kWh
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">Total usage</dt>
              <dd className="text-foreground">{Math.round(parsed.totalKwh).toLocaleString()} kWh</dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">Days covered</dt>
              <dd className="text-foreground">{parsed.daysCovered}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">Range</dt>
              <dd className="text-foreground text-[11px]">
                {parsed.earliest && parsed.latest
                  ? `${parsed.earliest} → ${parsed.latest}`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <WizardFooter
        onBack={onBack}
        onNext={onNext}
        nextLabel={parsed ? "See matches →" : "Skip · use default →"}
      />
      {!parsed && monthlyUsageKwh !== 1000 && (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          Skip keeps your current usage estimate of {monthlyUsageKwh.toLocaleString()} kWh/mo.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CSV parsing                                                        */
/* ------------------------------------------------------------------ */

/** Parse a Smart Meter Texas IntervalData.csv. Looks for a column whose name
 *  contains "kwh" (usage) and one containing "date", sums kWh per day, and
 *  computes a monthly average over the days covered. Robust to header-row
 *  position (some SMT exports prepend a metadata block before the real CSV
 *  header) and to quoted values. */
function parseSmtCsv(text: string): Parsed {
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
