import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from './schema';
import { createAuthHandlers, type AuthStore } from './authHandlers';

function createStore(): AuthStore | null {
  if (!db) return null;
  const client = db;
  return {
    async findByUsername(username) {
      const [user] = await client.select().from(users).where(eq(users.username, username)).limit(1);
      return user ?? null;
    },
    async create(input) {
      const [user] = await client.insert(users).values(input).returning();
      return user;
    },
  };
}
export const authHandlers = createAuthHandlers(createStore());
