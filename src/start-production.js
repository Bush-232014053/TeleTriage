#!/usr/bin/env node
require('dotenv').config();

async function main() {
  const { runSeed } = require('./db/seed');
  await runSeed({ closePool: false });
  require('./server');
}

main().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
