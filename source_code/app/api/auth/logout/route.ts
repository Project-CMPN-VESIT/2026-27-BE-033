import { NextResponse } from 'next/server';
import { sessionCookieName, sessionCookieOptions } from '@/lib/auth';
export const runtime = 'nodejs';
export async function POST() {
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(sessionCookieName, '', { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });
  return response;
}
