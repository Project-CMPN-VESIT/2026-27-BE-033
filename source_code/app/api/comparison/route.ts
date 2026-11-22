import { NextResponse } from "next/server";
import { parseExcelCandidates } from "@/lib/parseCandidates";

export const runtime = "nodejs";

// Comparison uses the bundled affidavit workbook, so browsing and selection
// remain available without a configured or reachable database.
export function GET() {
  try {
    return NextResponse.json({ candidates: parseExcelCandidates() });
  } catch (error) {
    console.error("[comparison] Failed to read bundled candidate data", error);
    return NextResponse.json(
      { error: "Candidate comparison data could not load. Please try again." },
      { status: 503 },
    );
  }
}
