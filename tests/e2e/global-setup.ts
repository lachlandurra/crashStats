import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const exec = promisify(execFile);

export default async function globalSetup() {
  const scriptPath = path.resolve('scripts/setup-e2e-db.js');
  await exec('node', [scriptPath], { env: { ...process.env } });
}
