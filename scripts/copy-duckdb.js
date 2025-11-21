#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const SOURCE_DB = path.resolve('data/crashes.duckdb');
const SOURCE_META = path.resolve('data/meta.json');
const TARGET_DIR = path.resolve('.next/standalone/data');

async function main() {
  if (!(await exists(TARGET_DIR))) {
    console.warn('[copy-duckdb] Skipping copy because .next/standalone was not generated.');
    return;
  }

  await fsp.mkdir(TARGET_DIR, { recursive: true });

  if (await exists(SOURCE_DB)) {
    await fsp.copyFile(SOURCE_DB, path.join(TARGET_DIR, 'crashes.duckdb'));
    console.log('[copy-duckdb] Copied crashes.duckdb');
  } else {
    console.warn('[copy-duckdb] data/crashes.duckdb not found; ensure you ran npm run refresh-data');
  }

  if (await exists(SOURCE_META)) {
    await fsp.copyFile(SOURCE_META, path.join(TARGET_DIR, 'meta.json'));
    console.log('[copy-duckdb] Copied meta.json');
  }
}

async function exists(filePath) {
  try {
    await fsp.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error('[copy-duckdb] Failed to copy DuckDB artifacts:', error);
  process.exitCode = 1;
});
