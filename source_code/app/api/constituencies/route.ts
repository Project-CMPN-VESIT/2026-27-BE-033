import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db, databaseUnavailable } from "@/lib/db";
import { candidates } from "@/lib/schema";
import { determineState } from "@/lib/verificationMatch";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!db) return databaseUnavailable();
  const params = new URL(request.url).searchParams;
  const state = params.get("state")?.trim();

  const rows = await db.select({
    constituency: candidates.constituency,
    state: candidates.state,
    count: sql<number>`count(*)::int`,
  }).from(candidates).groupBy(candidates.constituency, candidates.state).orderBy(candidates.constituency);

  const normalizedRows = rows
    .map((row) => ({ ...row, state: determineState(row.constituency, row.state === "Delhi" ? row.state : "") }))
    .filter((row) => !state || state.toLowerCase() === "all" || row.state === state);

  return NextResponse.json({ constituencies: normalizedRows });
}
