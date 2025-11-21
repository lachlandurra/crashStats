#!/usr/bin/env node
const duckdb = require('duckdb');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.resolve('test-data/e2e.duckdb');

async function main() {
  await fs.promises.mkdir(path.dirname(DB_PATH), { recursive: true });
  await removeIfExists(DB_PATH);

  const db = new duckdb.Database(DB_PATH);
  const connection = db.connect();

  await run(connection, 'INSTALL spatial;');
  await run(connection, 'LOAD spatial;');
  await run(
    connection,
    `CREATE TABLE crashes (
      accident_no TEXT,
      accident_date DATE,
      accident_time VARCHAR,
      accident_type TEXT,
      severity TEXT,
      day_of_week TEXT,
      speed_zone INTEGER,
      geom GEOMETRY
    );`
  );

  await run(
    connection,
    `INSERT INTO crashes VALUES
      ('E1', DATE '2024-01-01', '12:00:00', 'Rear-end', 'Serious injury accident', 'Monday', 50, ST_Point(145.0, -37.8)),
      ('E2', DATE '2024-02-15', '18:30:00', 'Head-on', 'Fatal accident', 'Thursday', 80, ST_Point(145.1, -37.9)),
      ('E3', DATE '2023-12-20', '09:15:00', 'Side collision', 'Non injury accident', 'Wednesday', 60, ST_Point(144.2, -36.9));`
  );

  connection.close();
  console.log(`E2E DuckDB prepared at ${DB_PATH}`);
}

function run(connection, sql) {
  return new Promise((resolve, reject) => {
    connection.run(sql, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function removeIfExists(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error('Failed to prepare e2e DuckDB:', error);
  process.exitCode = 1;
});
