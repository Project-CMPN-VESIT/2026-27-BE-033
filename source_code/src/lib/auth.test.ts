import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionToken, hashPassword, readSessionToken, sessionMaxAge, verifyPassword } from './auth';
import { createAuthHandlers, type AuthStore, type StoredUser } from './authHandlers';

let requestId = 0;
const request = (data: unknown, ip = `auth-test-${++requestId}`) => new Request('http://localhost/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(data) });
const details = { username: 'functional_test', name: 'Functional Test', age: '30', password: 'unit-test-password', confirmPassword: 'unit-test-password' };
const memory = () => {
  const rows: StoredUser[] = [];
  const store: AuthStore = {
    async findByUsername(name) { return rows.find(r => r.username === name) ?? null; },
    async create(input) { const row = { ...input, id: rows.length + 1 }; rows.push(row); return row; },
  };
  return { rows, handlers: createAuthHandlers(store) };
};

test('Passwords are salted, verified, and malformed hashes fail safely', () => {
  const a = hashPassword('unit-test-password'), b = hashPassword('unit-test-password');
  assert.notEqual(a, b);
  assert.equal(verifyPassword('unit-test-password', a), true);
  assert.equal(verifyPassword('wrong-password', a), false);
  assert.equal(verifyPassword('password', 'bad:hash'), false);
  assert.equal(verifyPassword('password', ''), false);
});
test('Sessions verify identity and server-side expiry, rejecting tampering and extra segments', () => {
  const user = { id: 1, username: 'sample', name: 'Sample User', age: 30 };
  const now = Date.now(), token = createSessionToken(user, now);
  assert.deepEqual(readSessionToken(token, now), user);
  assert.equal(readSessionToken(token, now + sessionMaxAge * 1000), null);
  assert.equal(readSessionToken(token + 'tampered', now), null);
  assert.equal(readSessionToken(token + '.ignored', now), null);
  assert.equal(readSessionToken('malformed'), null);
  assert.throws(() => createSessionToken({ ...user, age: -1 }));
});
test('Sign-up saves a hash, sets an HTTP-only cookie and excludes the hash from responses', async () => {
  const { rows, handlers } = memory();
  const response = await handlers.signup(request(details));
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(rows.length, 1);
  assert.equal(result.user.username, details.username);
  assert.equal(result.user.passwordHash, undefined);
  assert.notEqual(rows[0].passwordHash, details.password);
  assert.equal(verifyPassword(details.password, rows[0].passwordHash), true);
  assert.match(response.headers.get('set-cookie')!, /HttpOnly/);
  assert.match(response.headers.get('set-cookie')!, /SameSite=lax/i);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
test('Duplicate usernames are rejected without creating extra users', async () => {
  const { rows, handlers } = memory();
  await handlers.signup(request(details));
  assert.equal((await handlers.signup(request(details))).status, 409);
  assert.equal(rows.length, 1);
});
test('Confirmation, age, password length and username validation run on the server', async () => {
  const { rows, handlers } = memory();
  for (const invalid of [{ confirmPassword: 'different' }, { confirmPassword: null }, { age: true }, { age: '' }, { age: 0 }, { age: 121 }, { age: 3.5 }, { password: 8 }, { password: 'short', confirmPassword: 'short' }, { username: {} }, { username: 'ab' }, { name: [] }]) assert.equal((await handlers.signup(request({ ...details, ...invalid }))).status, 400);
  assert.equal(rows.length, 0);
});
test('Malformed or oversized JSON does not crash login or registration', async () => {
  const { handlers } = memory();
  const malformed = () => new Request('http://localhost/api/auth', { method: 'POST', body: '{' });
  assert.equal((await handlers.login(malformed())).status, 400);
  assert.equal((await handlers.signup(malformed())).status, 400);
  assert.equal((await handlers.login(request(null))).status, 400);
  assert.equal((await handlers.login(request({ username: {}, password: {} }))).status, 400);
  assert.equal((await handlers.signup(request({ ...details, name: 'x'.repeat(9000) }))).status, 413);
});
test('Login accepts the saved password, rejects bad credentials and trims the username', async () => {
  const { handlers } = memory();
  await handlers.signup(request(details));
  assert.equal((await handlers.login(request({ username: details.username, password: 'incorrect' }))).status, 401);
  assert.equal((await handlers.login(request({ username: 'nonexistent', password: 'incorrect' }))).status, 401);
  const response = await handlers.login(request({ username: ` ${details.username} `, password: details.password }));
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')!.split(';')[0].split('=').slice(1).join('=');
  assert.equal(readSessionToken(decodeURIComponent(cookie))?.username, details.username);
});
test('Database connection failures return a safe, actionable error', async () => {
  const handlers = createAuthHandlers({ findByUsername: async () => { throw new Error('secret database details'); }, create: async () => { throw new Error('secret database details'); } });
  const response = await handlers.login(request({ username: 'sample', password: 'password' }));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret database details/);
  assert.equal((await createAuthHandlers(null).signup(request(details))).status, 503);
});
test('A duplicate-username database race returns 409', async () => {
  const handlers = createAuthHandlers({ findByUsername: async () => null, create: async () => { throw { cause: { code: '23505' } }; } });
  assert.equal((await handlers.signup(request(details))).status, 409);
});
test('Repeated valid-shaped login attempts are rate limited', async () => {
  const handlers = createAuthHandlers({ findByUsername: async () => null, create: async () => { throw new Error(); } });
  for (let i = 0; i < 20; i++) assert.equal((await handlers.login(request({ username: 'nobody', password: 'incorrect' }, 'auth-rate-test'))).status, 401);
  const response = await handlers.login(request({ username: 'nobody', password: 'incorrect' }, 'auth-rate-test'));
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '600');
});
