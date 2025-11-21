#!/usr/bin/env node
const http = require('http');
const path = require('path');
const fs = require('fs/promises');
const next = require('next');

const hostname = process.env.HOSTNAME ?? '127.0.0.1';
const port = parseInt(process.env.PORT ?? '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

async function removeDevLock() {
  try {
    const lockPath = path.resolve('.next/dev/lock');
    await fs.rm(lockPath, { force: true });
  } catch {
    // ignore
  }
}

removeDevLock()
  .then(() => app.prepare())
  .then(() => {
    http
      .createServer((req, res) => {
        handle(req, res);
      })
      .listen(port, hostname, () => {
        console.log(`Ready on http://${hostname}:${port}`);
      });
  })
  .catch((error) => {
    console.error('Failed to start Next.js server:', error);
    process.exit(1);
  });
