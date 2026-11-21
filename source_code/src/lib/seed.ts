import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { candidates } from "./schema";
import { parseExcelCandidates } from "./parseCandidates";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const db = drizzle(neon(connectionString));
  const seedCandidates = parseExcelCandidates();

  console.log(`Seeding ${seedCandidates.length} candidates from Excel...`);

  const batchSize = 50;
  for (let i = 0; i < seedCandidates.length; i += batchSize) {
    const batch = seedCandidates.slice(i, i + batchSize);
    await db.insert(candidates).values(batch).onConflictDoUpdate({
      target: candidates.id,
      set: {
        name: sql`excluded.name`,
        party: sql`excluded.party`,
        constituency: sql`excluded.constituency`,
        state: sql`excluded.state`,
        photo: sql`excluded.photo`,
        credibilityScore: sql`excluded.credibility_score`,
        criminalRisk: sql`excluded.criminal_risk`,
        financialTransparency: sql`excluded.financial_transparency`,
        performance: sql`excluded.performance`,
        criminalCases: sql`excluded.criminal_cases`,
        assets: sql`excluded.assets`,
        liabilities: sql`excluded.liabilities`,
        education: sql`excluded.education`,
        age: sql`excluded.age`,
        experience: sql`excluded.experience`,
      },
    });
    console.log(`  Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} candidates)`);
  }

  console.log(`\nDone!`);
  for (const state of ["Delhi", "Karnataka", "Kerala", "Maharashtra"]) {
    console.log(`  ${state}: ${seedCandidates.filter((candidate) => candidate.state === state).length} candidates`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
