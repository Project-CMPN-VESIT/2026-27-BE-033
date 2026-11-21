import detailedRaw from "./data/verificationDetailed.json";
import qwenRaw from "./data/verificationQwen.json";
import adrRaw from "./data/verificationAdr.json";
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import type {
  AdrSource,
  QwenSource,
  VerificationCandidate,
  VerificationDataset,
  VerificationListItem,
  VerificationCoverage,
} from "./verificationTypes";

interface DetailedRow {
  id: string;
  srNo: number;
  name: string;
  party: string;
  criminalCases: number;
  education: string;
  age: number | null;
  totalAssets: string;
  liabilities: string;
  constituency: string;
  _norm: string;
  _normConst: string;
}

interface QwenRow {
  srNo: number;
  name: string;
  criminalCases: number;
  education: string;
  liabilities: string;
  _norm: string;
}

interface AdrRow {
  sNo: number | string;
  page: number;
  name: string;
  state: string;
  constituency: string;
  party: string;
  age: string | number;
  movable?: string;
  immovable?: string;
  total?: string;
  pan?: string;
  _norm: string;
  _normConst: string;
}

import {
  cleanDisplayName,
  determineState,
  isWinner,
  nameSimilarity,
  normalizeConstituency,
  normalizeText,
  stripHonorifics,
} from "./verificationMatch";

const norm = normalizeText;
const stripPrefix = stripHonorifics;
const normalizeConst = normalizeConstituency;
const similarity = nameSimilarity;

function loadDetailedRows(): DetailedRow[] {
  const workbookPath = path.join(
    process.cwd(),
    "Candidate Affidavits",
    "Candidate Detailed Info (1).xlsx",
  );

  if (!fs.existsSync(workbookPath)) return detailedRaw as DetailedRow[];

  const workbook = XLSX.read(fs.readFileSync(workbookPath));
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[workbook.SheetNames[0]],
    { defval: "" },
  );
  return rows
    .filter((row) => row["Sr.no"] !== "" && row["Candidate "] !== "")
    .map((row) => {
      const name = String(row["Candidate "] || "").trim();
      const constituency = String(row.Constituency || "").trim();
      return {
        id: String(Number(row["Sr.no"])),
        srNo: Number(row["Sr.no"]),
        name,
        party: String(row["Political Party"] || "").trim(),
        criminalCases: Number(row["Criminal Cases"]) || 0,
        education: String(row.Education || "").trim(),
        age: row.Age === "" ? null : Number(row.Age) || null,
        totalAssets: String(row["Total Assets"] || "").trim(),
        liabilities: String(row.Liabilities || "").trim(),
        constituency,
        _norm: normalizeText(stripHonorifics(name)),
        _normConst: normalizeConstituency(constituency),
      };
    });
}

const detailed = loadDetailedRows();
const qwen = qwenRaw as QwenRow[];
const adr = adrRaw as AdrRow[];

const adrByConst = new Map<string, AdrRow[]>();
for (const r of adr) {
  const key = normalizeConst(r.constituency);
  if (!adrByConst.has(key)) adrByConst.set(key, []);
  adrByConst.get(key)!.push(r);
}

const qwenByNorm = new Map<string, QwenRow[]>();
const qwenBySrNo = new Map<number, QwenRow[]>();
for (const r of qwen) {
  if (!qwenByNorm.has(r._norm)) qwenByNorm.set(r._norm, []);
  qwenByNorm.get(r._norm)!.push(r);
  if (!qwenBySrNo.has(r.srNo)) qwenBySrNo.set(r.srNo, []);
  qwenBySrNo.get(r.srNo)!.push(r);
}

function matchAdr(cand: DetailedRow): AdrSource {
  const pool = adrByConst.get(cand._normConst) || [];
  let best: AdrRow | null = null;
  let bestScore = 0;
  for (const r of pool) {
    const score = similarity(cand.name, r.name);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  if (best && bestScore >= 0.72) {
    const matchType = bestScore >= 0.99 ? "exact" : "fuzzy";
    return {
      found: true,
      matchType,
      matchScore: Math.round(bestScore * 1000) / 1000,
      sNo: Number(best.sNo) || null,
      page: best.page ?? null,
      name: best.name ?? "",
      state: best.state ?? "",
      constituency: best.constituency ?? "",
      party: best.party ?? "",
      age: best.age === undefined || best.age === null ? null : Number(best.age) || null,
      movableAssets: best.movable ?? "",
      immovableAssets: best.immovable ?? "",
      totalAssets: best.total ?? "",
      panGiven: best.pan ?? "",
    };
  }
  return {
    found: false,
    matchType: "none",
    matchScore: 0,
    sNo: null,
    page: null,
    name: "",
    state: "",
    constituency: "",
    party: "",
    age: null,
    movableAssets: "",
    immovableAssets: "",
    totalAssets: "",
    panGiven: "",
  };
}

function matchQwen(cand: DetailedRow): QwenSource {
  const cn = norm(stripPrefix(cand.name));
  const pool = qwenByNorm.get(cn);
  if (pool && pool.length > 0) {
    const r = pool[0];
    return {
      found: true,
      matchType: "exact",
      srNo: r.srNo ?? null,
      name: r.name ?? "",
      criminalCases: r.criminalCases ?? null,
      education: r.education ?? "",
      liabilities: r.liabilities ?? "",
    };
  }
  // Qwen keeps the same row order for the first 248 rows, so the serial
  // number is a safer fallback than fuzzy name matching across all 999 rows.
  const bySrNo = qwenBySrNo.get(cand.srNo);
  if (bySrNo && bySrNo.length > 0 && similarity(cand.name, bySrNo[0].name) >= 0.45) {
    const r = bySrNo[0];
    return {
      found: true,
      matchType: "fuzzy",
      srNo: r.srNo ?? null,
      name: r.name ?? "",
      criminalCases: r.criminalCases ?? null,
      education: r.education ?? "",
      liabilities: r.liabilities ?? "",
    };
  }
  // fuzzy across all
  let best: QwenRow | null = null;
  let bestScore = 0;
  for (const r of qwen) {
    const score = similarity(cand.name, r.name);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  if (best && bestScore >= 0.72) {
    return {
      found: true,
      matchType: "fuzzy",
      srNo: best.srNo ?? null,
      name: best.name ?? "",
      criminalCases: best.criminalCases ?? null,
      education: best.education ?? "",
      liabilities: best.liabilities ?? "",
    };
  }
  return {
    found: false,
    matchType: "none",
    srNo: null,
    name: "",
    criminalCases: null,
    education: "",
    liabilities: "",
  };
}

function buildCandidates(): VerificationCandidate[] {
  return detailed.map((cand) => {
    const adr = matchAdr(cand);
    const qwenRes = matchQwen(cand);
    const state = determineState(cand.constituency, adr.state || "");
    return {
      id: cand.id,
      srNo: cand.srNo,
      name: cand.name,
      displayName: cleanDisplayName(cand.name),
      isWinner: isWinner(cand.name),
      party: cand.party,
      constituency: cand.constituency,
      state,
      detailed: {
        name: cand.name,
        party: cand.party,
        criminalCases: cand.criminalCases,
        education: cand.education,
        age: cand.age,
        totalAssets: cand.totalAssets,
        liabilities: cand.liabilities,
        constituency: cand.constituency,
      },
      adr,
      qwen: qwenRes,
    };
  });
}

let cached: VerificationDataset | null = null;

export function getVerificationDataset(): VerificationDataset {
  if (cached) return cached;
  const candidates = buildCandidates();
  cached = {
    generatedAt: new Date().toISOString(),
    sources: {
      detailed: { file: "Candidate Detailed Info (1).xlsx", sheet: "Table 3", rowCount: detailed.length },
      adr: { file: "ADR Candidate Info data.pdf", pageCount: 599, recordCount: adr.length },
      qwen: { file: "Qwen Model data.xlsx", sheet: "Table 3", rowCount: qwen.length },
    },
    candidates,
  };
  return cached;
}

export function getVerificationList(): VerificationListItem[] {
  const ds = getVerificationDataset();
  return ds.candidates.map((c) => ({
    id: c.id,
    srNo: c.srNo,
    name: c.name,
    displayName: c.displayName,
    isWinner: c.isWinner,
    party: c.party,
    constituency: c.constituency,
    state: c.state,
    adrFound: c.adr.found,
    adrMatchType: c.adr.matchType,
    qwenFound: c.qwen.found,
  }));
}

export function getVerificationCoverage(): VerificationCoverage {
  const ds = getVerificationDataset();
  let adrFound = 0, adrExact = 0, adrFuzzy = 0, adrMissing = 0, qwenFound = 0, qwenMissing = 0;
  for (const c of ds.candidates) {
    if (c.adr.found) {
      adrFound++;
      if (c.adr.matchType === "exact") adrExact++;
      else if (c.adr.matchType === "fuzzy") adrFuzzy++;
    } else {
      adrMissing++;
    }
    if (c.qwen.found) qwenFound++;
    else qwenMissing++;
  }
  return { total: ds.candidates.length, adrFound, adrExact, adrFuzzy, adrMissing, qwenFound, qwenMissing };
}

export function getVerificationCandidate(id: string) {
  const ds = getVerificationDataset();
  const c = ds.candidates.find((x) => x.id === id);
  if (!c) return null;
  return c;
}
