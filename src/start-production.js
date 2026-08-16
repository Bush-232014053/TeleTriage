#!/usr/bin/env node
require('dotenv').config();

async function seedWithRetry(maxAttempts = 12) {
  const { runSeed } = require('./db/seed');
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await runSeed({ closePool: false });
      console.log('Database seed complete.');
      return;
    } catch (err) {
      console.error(`Seed attempt ${attempt}/${maxAttempts} failed:`, err.message);
      if (attempt === maxAttempts) {
        console.error('Seed skipped after retries — API is up; check DATABASE_URL / PGSSL.');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(5000 * attempt, 30000)));
    }
  }
}

// Start HTTP server first so Render health checks pass quickly on cold start.
require('./server');

seedWithRetry().catch((err) => {
  console.error('Background seed error:', err.message);
});
