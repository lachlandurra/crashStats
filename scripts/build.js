#!/usr/bin/env node
const path = require('path');
const build = require('next/dist/build').default;

async function main() {
  const projectDir = path.resolve('.');
  await build(projectDir);
}

main().catch((error) => {
  console.error('Next.js build failed:', error);
  process.exit(1);
});
