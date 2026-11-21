import { NextResponse } from "next/server";
import {
  getVerificationCoverage,
  getVerificationList,
} from "@/lib/verificationData";

export const runtime = "nodejs";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim().toLowerCase() ?? "";
  const state = params.get("state")?.trim().toLowerCase() ?? "";

  const candidates = getVerificationList().filter((candidate) => {
    const matchesQuery =
      !query ||
      [candidate.displayName, candidate.party, candidate.constituency]
        .some((value) => value.toLowerCase().includes(query));
    const matchesState = !state || candidate.state.toLowerCase() === state;
    return matchesQuery && matchesState;
  });

  return NextResponse.json({
    candidates,
    coverage: getVerificationCoverage(),
  });
}