import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { readSessionToken, sessionCookieName } from '@/lib/auth';
export const runtime = 'nodejs';
export async function GET() {
  const user = readSessionToken((await cookies()).get(sessionCookieName)?.value);
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
}
