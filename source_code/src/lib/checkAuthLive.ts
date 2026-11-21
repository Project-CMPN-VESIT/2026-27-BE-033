/** Live check: creates one random synthetic account, tests auth, then deletes only that account. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';

async function main() {
  if (!db) throw new Error('DATABASE_URL is not configured.');
  await db.select({ id: users.id }).from(users).limit(0);
  if (process.argv.includes('--check-only')) { console.log('Authentication database table is available.'); return; }
  const username = `auth_check_${Date.now()}_${randomBytes(4).toString('hex')}`;
  const password = randomBytes(24).toString('base64url');
  const details = { username, password, confirmPassword: password, name: 'Functional Auth Check', age: 30 };
  let createdId: number | undefined;
  const post = async (path: string, value?: unknown, cookie?: string) => fetch(`http://localhost:3000/api/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: value === undefined ? undefined : JSON.stringify(value), signal: AbortSignal.timeout(30000),
  });
  const me = async (cookie?: string) => {
    const r = await fetch('http://localhost:3000/api/auth/me', { headers: cookie ? { Cookie: cookie } : {}, signal: AbortSignal.timeout(30000) });
    assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store'); return r.json();
  };
  try {
    assert.equal((await me()).user, null);
    assert.equal((await post('signup', { ...details, confirmPassword: 'does-not-match' })).status, 400);
    assert.equal((await post('signup', { ...details, age: 0 })).status, 400);
    const signup = await post('signup', details);
    assert.equal(signup.status, 201, 'Live registration should create an account');
    const signupData = await signup.json();
    createdId = signupData.user.id;
    assert.equal(signupData.user.passwordHash, undefined);
    const setCookie = signup.headers.get('set-cookie')!;
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=lax/i);
    const signupCookie = setCookie.split(';')[0];
    assert.equal((await me(signupCookie)).user.id, createdId);
    console.log('PASS live registration, confirmation/age validation and signed-in session');
    assert.equal((await post('signup', details)).status, 409);
    assert.equal((await post('login', { username, password: 'incorrect-password' })).status, 401);
    console.log('PASS duplicate username and incorrect password rejection');
    const login = await post('login', { username: ` ${username} `, password });
    assert.equal(login.status, 200);
    const loginCookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.equal((await me(loginCookie)).user.id, createdId);
    assert.equal((await me(loginCookie)).user.id, createdId);
    assert.equal((await me(loginCookie + 'tampered')).user, null);
    console.log('PASS live login, session persistence and cookie tampering rejection');
    const logout = await post('logout', undefined, loginCookie);
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/i);
    assert.equal((await me()).user, null);
    console.log('PASS logout clears the browser session cookie');
  } finally {
    const where = createdId === undefined ? eq(users.username, username) : and(eq(users.id, createdId), eq(users.username, username));
    const deleted = await db.delete(users).where(where).returning({ id: users.id });
    console.log(`Temporary test account cleanup: ${deleted.length} account(s) removed.`);
  }
}
main().catch(() => { console.error('Live authentication check failed; check database availability and the local server. No credentials were printed.'); process.exitCode = 1; });
