import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export const sessionCookieName = 'chunav_session';
export const sessionMaxAge = 60 * 60 * 24 * 30;
export type SessionUser = { id: number; username: string; name: string; age: number };
const developmentState = globalThis as typeof globalThis & { __chunavDevelopmentSecret?: string };
export function authConfigured() { return process.env.NODE_ENV !== 'production' || !!process.env.AUTH_SECRET?.trim(); }
function secret() {
  if (process.env.AUTH_SECRET?.trim()) return process.env.AUTH_SECRET;
  if (!authConfigured()) throw new Error('AUTH_SECRET must be configured in production.');
  // Stable through dev hot reloads, without a public hard-coded signing key.
  return developmentState.__chunavDevelopmentSecret ??= randomBytes(32).toString('hex');
}
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, storedHash: string) {
  if (typeof password !== 'string' || password.length > 128 || !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(storedHash)) return false;
  const [salt, expected] = storedHash.split(':');
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
const signature = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');
function validUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false;
  const u = value as SessionUser;
  return Number.isSafeInteger(u.id) && u.id > 0 && typeof u.username === 'string' && u.username.length > 0 && u.username.length <= 64 && typeof u.name === 'string' && u.name.length > 0 && u.name.length <= 120 && Number.isInteger(u.age) && u.age >= 1 && u.age <= 120;
}
export function createSessionToken(user: SessionUser, now = Date.now()) {
  if (!validUser(user)) throw new Error('Invalid session user');
  const payload = Buffer.from(JSON.stringify({ user, expiresAt: now + sessionMaxAge * 1000 })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function readSessionToken(token: string | undefined, now = Date.now()): SessionUser | null {
  if (!token || token.length > 4096 || !authConfigured()) return null;
  const [payload, sig, extra] = token.split('.');
  if (!payload || !sig || extra !== undefined || !/^[a-zA-Z0-9_-]+$/.test(payload) || !/^[a-zA-Z0-9_-]{43}$/.test(sig)) return null;
  const expected = signature(payload);
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const envelope = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(envelope.expiresAt) || envelope.expiresAt <= now || !validUser(envelope.user)) return null;
    return { id: envelope.user.id, username: envelope.user.username, name: envelope.user.name, age: envelope.user.age };
  } catch { return null; }
}
export const sessionCookieOptions = () => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionMaxAge });
