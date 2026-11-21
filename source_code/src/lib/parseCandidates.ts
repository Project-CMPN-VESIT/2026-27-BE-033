import * as XLSX from "xlsx";
import path from "path";
import fs from "node:fs";
import { determineState } from "./verificationMatch";

interface RawCandidate {
  srNo: number;
  name: string;
  party: string;
  criminalCases: number;
  education: string;
  age: number;
  totalAssets: string;
  liabilities: string;
  constituency: string;
}

export interface SeedCandidate {
  id: string;
  name: string;
  party: string;
  constituency: string;
  state: string;
  photo: string;
  credibilityScore: number;
  criminalRisk: number;
  financialTransparency: number;
  performance: number;
  criminalCases: number;
  assets: string;
  liabilities: string;
  education: string;
  age: number;
  experience: string;
}

function parseIndianRupees(s: string): number {
  const cleaned = s.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function formatAssets(rawAmount: number): string {
  if (rawAmount >= 10000000) {
    return `₹${(rawAmount / 10000000).toFixed(1)} Cr`;
  }
  if (rawAmount >= 100000) {
    return `₹${(rawAmount / 100000).toFixed(1)} Lakh`;
  }
  return `₹${rawAmount.toLocaleString("en-IN")}`;
}

function calculateCriminalRisk(criminalCases: number): number {
  return Math.round(100 / (1 + criminalCases));
}

function calculateFinancialTransparency(totalAssets: number, liabilities: number): number {
  return Math.round(Math.max(0, (1 - liabilities / (totalAssets + 1)) * 100));
}

function calculateEducationScore(education: string): number {
  const value = education.toLowerCase().replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  if (/(doctorate|ph\.?d|m\.?d|ll\.?b|professional degree)/i.test(value)) return 100;
  if (/(post graduate|postgraduate|post-graduate)/i.test(value)) return 85;
  if (/(graduate professional|graduate degree|graduate|b\.?a|b\.?sc|b\.?tech|b\.?com)/i.test(value)) return 70;
  if (/(higher secondary|12th|twelfth)/i.test(value)) return 50;
  if (/(secondary|10th|matriculation)/i.test(value)) return 35;
  if (/(8th|5th|literate|primary|below 10th)/i.test(value)) return 20;
  return 10;
}

function calculateCredibilityScore(
  criminalRisk: number,
  financialTransparency: number,
  educationScore: number,
): number {
  return Math.round(
    criminalRisk * 0.5 +
    educationScore * 0.2 +
    financialTransparency * 0.3,
  );
}

function calculatePerformance(credibilityScore: number, criminalCases: number): number {
  let perf = credibilityScore * 0.65;
  if (criminalCases === 0) perf += 18;
  else if (criminalCases <= 2) perf += 10;
  else perf -= Math.min(20, criminalCases * 1.5);
  return Math.max(5, Math.min(95, Math.round(perf)));
}

function generateExperience(age: number, education: string): string {
  const yearsInPolitics = Math.max(1, Math.floor((age - 25) * 0.4));
  if (yearsInPolitics <= 3) return `${yearsInPolitics} years in local governance`;
  if (yearsInPolitics <= 8) return `${yearsInPolitics} years in public service`;
  if (yearsInPolitics <= 15) return `${yearsInPolitics} years in politics and social work`;
  return `${yearsInPolitics} years in politics and governance`;
}

function generatePhotoUrl(name: string, index: number): string {
  const colors = ["3B82F6", "EF4444", "10B981", "F59E0B", "8B5CF6", "EC4899", "06B6D4", "F97316"];
  const color = colors[index % colors.length];
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${color}&color=fff&size=400&bold=true&format=svg`;
}

export function parseExcelCandidates(): SeedCandidate[] {
  const sourcePath = path.resolve(process.cwd(), "Candidate Affidavits", "Candidate Detailed Info (1).xlsx");
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Candidate affidavit workbook not found: ${sourcePath}`);
  }
  const workbook = XLSX.readFile(sourcePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const rawCandidates: RawCandidate[] = rows.slice(1)
    .filter((row): row is unknown[] => Array.isArray(row) && row[0] != null && row[1] != null)
    .map((row) => ({
      srNo: Number(row[0]),
      name: String(row[1]).trim(),
      party: String(row[2]).trim(),
      criminalCases: Number(row[3]) || 0,
      education: String(row[4]).trim(),
      age: Number(row[5]) || 35,
      totalAssets: String(row[6]).trim(),
      liabilities: String(row[7]).trim(),
      constituency: String(row[8]).trim(),
    }));

  return rawCandidates.map((raw, index): SeedCandidate => {
    const assetValue = parseIndianRupees(raw.totalAssets);
    const liabilityValue = parseIndianRupees(raw.liabilities);
    const criminalRisk = calculateCriminalRisk(raw.criminalCases);
    const financialTransparency = calculateFinancialTransparency(assetValue, liabilityValue);
    const educationScore = calculateEducationScore(raw.education);
    const credibilityScore = calculateCredibilityScore(
      criminalRisk, financialTransparency, educationScore,
    );
    const performance = calculatePerformance(credibilityScore, raw.criminalCases);
    const state = determineState(raw.constituency);
    const cleanConstituency = raw.constituency.replace(/^Delhi\(/, "").replace(/\)$/, "");
    const cleanedName = raw.name.replace(/\s+/g, " ").trim();

    return {
      id: String(raw.srNo),
      name: cleanedName,
      party: raw.party,
      constituency: cleanConstituency,
      state,
      photo: generatePhotoUrl(cleanedName, index),
      credibilityScore,
      criminalRisk,
      financialTransparency,
      performance,
      criminalCases: raw.criminalCases,
      assets: formatAssets(assetValue),
      liabilities: formatAssets(liabilityValue),
      education: raw.education,
      age: raw.age,
      experience: generateExperience(raw.age, raw.education),
    };
  });
}

if (typeof require !== "undefined" && require.main === module) {
  const candidates = parseExcelCandidates();
  console.log(`Parsed ${candidates.length} candidates from Excel.`);
  console.log("\nSample:");
  candidates.slice(0, 3).forEach(c => console.log(JSON.stringify(c, null, 2)));
  const delhiCount = candidates.filter(c => c.state === "Delhi").length;
  const keralaCount = candidates.filter(c => c.state === "Kerala").length;
  console.log(`\nDelhi: ${delhiCount}, Kerala: ${keralaCount}`);
}
