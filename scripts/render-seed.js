#!/usr/bin/env node
// Run during Render preDeploy — retries until Postgres is reachable.
require('dotenv').config();
const { runSeed } = require('../src/db/seed');

const MAX = 15;

async function main() {
  for (let attempt = 1; attempt <= MAX; attempt += 1) {
    try {
      await runSeed();
      console.log('Render preDeploy seed complete.');
      return;
    } catch (err) {
      console.error(`Seed attempt ${attempt}/${MAX}:`, err.message);
      if (attempt === MAX) throw err;
      await new Promise((r) => setTimeout(r, Math.min(4000 * attempt, 30000)));
    }
  }
}

main().catch((err) => {
  console.error('Render preDeploy seed failed:', err);
  process.exit(1);
});
