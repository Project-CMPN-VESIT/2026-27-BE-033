import { NextResponse } from "next/server";
import { buildChecks, summarizeChecks } from "@/lib/verificationChecks";
import { getVerificationCandidate } from "@/lib/verificationData";

export const runtime = "nodejs";

export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(({ id }) => {
    const candidate = getVerificationCandidate(id);
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    }

    const checks = buildChecks(candidate);
    return NextResponse.json({
      candidate,
      checks,
      summary: summarizeChecks(checks),
    });
  });
}