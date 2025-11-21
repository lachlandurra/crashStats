#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const pkgPath = path.resolve('node_modules/duckdb/package.json');

function main() {
  if (!fs.existsSync(pkgPath)) {
    console.warn('[patch-duckdb] duckdb is not installed; skipping napi patch.');
    return;
  }

  const raw = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(raw);

  pkg.binary = pkg.binary || {};

  const hasNapiToken = (value) =>
    typeof value === 'string' &&
    (value.includes('{napi_build_version}') || value.includes('{node_napi_label}'));

  const existing = Array.isArray(pkg.binary.napi_versions)
    ? pkg.binary.napi_versions.filter((v) => Number.isFinite(v))
    : [];

  const current = Number(process.versions.napi);
  if (Number.isFinite(current) && !existing.includes(current)) {
    existing.push(current);
  }

  if (!existing.length) {
    // Fallback to a sensible default that works for recent Node versions.
    existing.push(8);
  }

  existing.sort((a, b) => a - b);
  pkg.binary.napi_versions = existing;

  const moduleName = pkg.binary.module_name || 'duckdb';
  const moduleRoot = path.dirname(pkgPath);
  const desiredModulePath = './lib/binding/napi-v{napi_build_version}';
  if (!hasNapiToken(pkg.binary.module_path)) {
    pkg.binary.module_path = desiredModulePath;
  }

  if (!hasNapiToken(pkg.binary.package_name)) {
    pkg.binary.package_name = '{module_name}-v{version}-napi-v{napi_build_version}-{platform}-{arch}.tar.gz';
  }

  const napiDirVersion = current || existing[existing.length - 1] || 0;
  const resolvedModulePath = path
    .resolve(moduleRoot, pkg.binary.module_path.replace('{napi_build_version}', String(napiDirVersion)).replace('{node_napi_label}', `napi-v${napiDirVersion}`));
  const targetBinary = path.join(resolvedModulePath, `${moduleName}.node`);
  const originalBinary = path.resolve(moduleRoot, 'lib/binding', `${moduleName}.node`);

  if (!fs.existsSync(targetBinary) && fs.existsSync(originalBinary)) {
    fs.mkdirSync(path.dirname(targetBinary), { recursive: true });
    fs.copyFileSync(originalBinary, targetBinary);
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log('[patch-duckdb] Ensured binary.napi_versions is set:', pkg.binary.napi_versions);
}

main();
