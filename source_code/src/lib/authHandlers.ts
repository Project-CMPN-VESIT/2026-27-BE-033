import { NextResponse } from 'next/server';
import { authConfigured, createSessionToken, hashPassword, sessionCookieName, sessionCookieOptions, verifyPassword, type SessionUser } from './auth';

export type StoredUser = SessionUser & { passwordHash: string };
export interface AuthStore {
  findByUsername(username: string): Promise<StoredUser | null>;
  create(input: Omit<StoredUser, 'id'>): Promise<StoredUser>;
}
const noStore = { 'Cache-Control': 'no-store' };
const error = (message: string, status: number, headers: Record<string, string> = {}) => NextResponse.json({ error: message }, { status, headers: { ...noStore, ...headers } });
const dummyHash = hashPassword('not-a-real-user-password');
const limits = new Map<string, { count: number; until: number }>();
function allow(request: Request, action: string) {
  const now = Date.now();
  for (const [key, item] of limits) if (item.until <= now) limits.delete(key);
  const key = `${action}:${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'}`;
  const item = limits.get(key) ?? { count: 0, until: now + 10 * 60_000 };
  if (item.count >= 20 || (!limits.has(key) && limits.size >= 10000)) return false;
  item.count++; limits.set(key, item); return true;
}
async function body(request: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const reader = request.body?.getReader();
    if (!reader) return error('Enter the required account details.', 400);
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const next = await reader.read(); if (next.done) break;
      length += next.value.byteLength;
      if (length > 8192) { await reader.cancel(); return error('Account details are too long.', 413); }
      chunks.push(next.value);
    }
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return error('Enter valid account details.', 400);
    return parsed;
  } catch { return error('Invalid request. Please try again.', 400); }
}
function signedIn(user: StoredUser, status = 200) {
  const publicUser: SessionUser = { id: user.id, username: user.username, name: user.name, age: user.age };
  const response = NextResponse.json({ user: publicUser }, { status, headers: noStore });
  response.cookies.set(sessionCookieName, createSessionToken(publicUser), sessionCookieOptions());
  return response;
}
function databaseError(reason: unknown) {
  const e = reason as { code?: string; cause?: { code?: string } };
  if (e?.code === '23505' || e?.cause?.code === '23505') return error('That username is already registered. Please choose another.', 409);
  return error('Sign-in is temporarily unavailable. Please try again shortly.', 503);
}
export function createAuthHandlers(store: AuthStore | null) {
  function ready() {
    if (!authConfigured()) return error('Sign-in is not configured on the server. Set AUTH_SECRET.', 503);
    if (!store) return error('Sign-in requires a configured database. Set DATABASE_URL on the server.', 503);
    return null;
  }
  return {
    async login(request: Request) {
      const data = await body(request); if (data instanceof NextResponse) return data;
      const username = typeof data.username === 'string' ? data.username.trim() : '';
      if (!username || username.length > 64 || typeof data.password !== 'string' || !data.password || data.password.length > 128) return error('Enter your username and password.', 400);
      const unavailable = ready(); if (unavailable) return unavailable;
      if (!allow(request, 'login')) return error('Too many sign-in attempts. Please try again in 10 minutes.', 429, { 'Retry-After': '600' });
      try {
        const user = await store!.findByUsername(username);
        const correct = verifyPassword(data.password, user?.passwordHash ?? dummyHash);
        if (!user || !correct) return error('Invalid username or password.', 401);
        return signedIn(user);
      } catch (reason) { return databaseError(reason); }
    },
    async signup(request: Request) {
      const data = await body(request); if (data instanceof NextResponse) return data;
      const username = typeof data.username === 'string' ? data.username.trim() : '';
      const name = typeof data.name === 'string' ? data.name.trim().replace(/\s+/g, ' ') : '';
      const rawAge = typeof data.age === 'number' || typeof data.age === 'string' ? String(data.age) : '';
      const age = /^\d+$/.test(rawAge) ? Number(rawAge) : NaN;
      if (!/^[A-Za-z0-9_.-]{3,64}$/.test(username)) return error('Use a username of 3-64 letters, numbers, dots, underscores or hyphens.', 400);
      if (!name || name.length > 120 || !Number.isInteger(age) || age < 1 || age > 120 || typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 128) return error('Enter a name, an age from 1 to 120, and a password of 8-128 characters.', 400);
      if (typeof data.confirmPassword !== 'string' || data.confirmPassword !== data.password) return error('Your passwords do not match.', 400);
      const unavailable = ready(); if (unavailable) return unavailable;
      if (!allow(request, 'signup')) return error('Too many account attempts. Please try again in 10 minutes.', 429, { 'Retry-After': '600' });
      try {
        if (await store!.findByUsername(username)) return error('That username is already registered. Please choose another.', 409);
        const user = await store!.create({ username, name, age, passwordHash: hashPassword(data.password) });
        return signedIn(user, 201);
      } catch (reason) { return databaseError(reason); }
    },
  };
}
