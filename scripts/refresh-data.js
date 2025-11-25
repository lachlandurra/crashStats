#!/usr/bin/env node
const { mkdir, copyFile, writeFile, readFile, unlink, access } = require("fs/promises");
const { createWriteStream } = require("fs");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Readable } = require("stream");
const { spawn } = require("child_process");

const DATA_DIR = path.resolve("data");
const RAW_CSV_PATH = path.join(DATA_DIR, "raw.csv");
const DB_PATH = path.join(DATA_DIR, "crashes.duckdb");
const META_JSON_PATH = path.join(DATA_DIR, "meta.json");
const META_TMP_PATH = path.join(DATA_DIR, "meta.tmp.json");
const DEFAULT_SOURCE_URL =
  process.env.CRASH_DATA_URL ??
  "https://opendata.transport.vic.gov.au/dataset/bb77800e-1857-4edc-bf9e-e188437a1c8e/resource/5df1f373-0c90-48f5-80e1-7b2a35507134/download/victorian_road_crash_data.csv";
const DEFAULT_DUCKDB_BIN = process.env.DUCKDB_BIN ?? "duckdb";
const DATA_VERSION = process.env.DATA_VERSION;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = args.source ?? DEFAULT_SOURCE_URL;
  const duckdbBin = args.duckdb ?? DEFAULT_DUCKDB_BIN;
  await mkdir(DATA_DIR, { recursive: true });

  console.log(`→ [1/4] Fetching crash data from ${source}`);
  const resolvedSource = await downloadOrCopy({
    source,
    destination: RAW_CSV_PATH,
    allowLocalFallback: !args.source
  });
  console.log(`   Saved to ${RAW_CSV_PATH}`);

  console.log("→ [2/4] Building DuckDB database");
  await runDuckDBScript(duckdbBin, buildImportSql({
    csvPath: RAW_CSV_PATH,
    dbPath: DB_PATH,
    metaTmpPath: META_TMP_PATH,
    sourceUrl: resolvedSource,
    downloadedAt: new Date().toISOString()
  }));

  console.log("→ [3/4] Reading meta snapshot");
  const metaRow = await readMetaRow(META_TMP_PATH);
  await unlinkSafe(META_TMP_PATH);

  const meta = {
    sourceUrl: resolvedSource,
    downloadedAt: metaRow?.downloaded_at ?? new Date().toISOString(),
    rowCount: Number(metaRow?.row_count ?? 0),
    latestAccidentDate: metaRow?.latest_accident_date ?? null,
    dataVersion: args.dataVersion ?? DATA_VERSION ?? metaRow?.latest_accident_date ?? "unknown"
  };
  await writeFile(META_JSON_PATH, JSON.stringify(meta, null, 2));
  console.log(`   Meta written to ${META_JSON_PATH}`);

  console.log("→ [4/4] Done. Summary:");
  console.log(
    `   Rows: ${meta.rowCount} | Latest accident date: ${meta.latestAccidentDate} | Data version label: ${meta.dataVersion}`
  );
}

function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    if (arg.startsWith("--") && arg.includes("=")) {
      const [key, value] = arg.slice(2).split("=", 2);
      acc[key] = value;
    } else if (arg.startsWith("--")) {
      acc[arg.slice(2)] = true;
    }
    return acc;
  }, {});
}

async function downloadOrCopy({ source, destination, allowLocalFallback }) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok || !response.body) {
      if (allowLocalFallback && (await fileExists(destination))) {
        console.warn(
          `   Download failed (${response.status} ${response.statusText}). Using existing local ${destination}`
        );
        return path.resolve(destination);
      }
      throw new Error(`Failed to download CSV (${response.status} ${response.statusText})`);
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
    return source;
  }

  const absolute = path.resolve(source);
  if (absolute === path.resolve(destination)) {
    return absolute;
  }
  await copyFile(absolute, destination);
  return absolute;
}

function escapeLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildImportSql({ csvPath, metaTmpPath, sourceUrl, downloadedAt }) {
  const csvLiteral = escapeLiteral(path.resolve(csvPath));
  const metaLiteral = escapeLiteral(path.resolve(metaTmpPath));
  const sourceLiteral = escapeLiteral(sourceUrl);
  const downloadedLiteral = escapeLiteral(downloadedAt);

  return `
PRAGMA threads=4;
INSTALL spatial;
LOAD spatial;

CREATE OR REPLACE TABLE staging AS
SELECT *
FROM read_csv_auto(${csvLiteral}, header=true, ignore_errors=true, sample_size=-1, all_varchar=true);

CREATE OR REPLACE TABLE crashes AS
SELECT
  ACCIDENT_NO::TEXT AS accident_no,
  COALESCE(
    TRY_CAST(ACCIDENT_DATE AS DATE),
    TRY_STRPTIME(ACCIDENT_DATE, '%Y%m%d')::DATE
  ) AS accident_date,
  ACCIDENT_TIME AS accident_time,
  ACCIDENT_TYPE AS accident_type,
  DCA_CODE_DESCRIPTION AS dca_code_description,
  SEVERITY AS severity,
  DAY_OF_WEEK AS day_of_week,
  TRY_CAST(NULLIF(TRIM(REGEXP_EXTRACT(SPEED_ZONE, '([0-9]+)')), '') AS INTEGER) AS speed_zone,
  ST_Point(CAST(LONGITUDE AS DOUBLE), CAST(LATITUDE AS DOUBLE)) AS geom,
  LGA_NAME AS lga_name,
  LIGHT_CONDITION AS light_condition,
  ROAD_GEOMETRY AS road_geometry,
  TRY_CAST(NULLIF(TRIM(TOTAL_PERSONS), '') AS INTEGER) AS total_persons,
  TRY_CAST(NULLIF(TRIM(BICYCLIST), '') AS INTEGER) AS bicyclist_count,
  TRY_CAST(NULLIF(TRIM(PEDESTRIAN), '') AS INTEGER) AS pedestrian_count,
  TRY_CAST(NULLIF(TRIM(HEAVYVEHICLE), '') AS INTEGER) AS heavy_vehicle_count,
  TRY_CAST(NULLIF(TRIM(PASSENGER), '') AS INTEGER) AS passenger_count,
  TRY_CAST(NULLIF(TRIM(DRIVER), '') AS INTEGER) AS driver_count,
  TRY_CAST(NULLIF(TRIM(PILLION), '') AS INTEGER) AS pillion_count,
  TRY_CAST(NULLIF(TRIM(MOTORCYCLIST), '') AS INTEGER) AS motorcyclist_count,
  TRY_CAST(NULLIF(TRIM(UNKNOWN), '') AS INTEGER) AS unknown_count,
  TRY_CAST(NULLIF(TRIM(PED_CYCLIST_5_12), '') AS INTEGER) AS ped_cyclist_5_12,
  TRY_CAST(NULLIF(TRIM(PED_CYCLIST_13_18), '') AS INTEGER) AS ped_cyclist_13_18,
  TRY_CAST(NULLIF(TRIM(OLD_PED_65_AND_OVER), '') AS INTEGER) AS old_ped_65_and_over,
  TRY_CAST(NULLIF(TRIM(OLD_DRIVER_75_AND_OVER), '') AS INTEGER) AS old_driver_75_and_over,
  TRY_CAST(NULLIF(TRIM(YOUNG_DRIVER_18_25), '') AS INTEGER) AS young_driver_18_25,
  TRY_CAST(NULLIF(TRIM(NO_OF_VEHICLES), '') AS INTEGER) AS no_of_vehicles,
  TRY_CAST(NULLIF(TRIM(PASSENGERVEHICLE), '') AS INTEGER) AS passenger_vehicle_count,
  TRY_CAST(NULLIF(TRIM(MOTORCYCLE), '') AS INTEGER) AS motorcycle_count,
  TRY_CAST(NULLIF(TRIM(PT_VEHICLE), '') AS INTEGER) AS public_transport_vehicle_count,
  RMA AS rma
FROM staging
WHERE TRY_CAST(LONGITUDE AS DOUBLE) IS NOT NULL
  AND TRY_CAST(LATITUDE AS DOUBLE) IS NOT NULL
  AND UPPER(LGA_NAME) = 'KINGSTON';

DROP TABLE staging;

CREATE INDEX IF NOT EXISTS crashes_geom_idx ON crashes USING RTREE (geom);

COPY (
  SELECT
    ${sourceLiteral} AS source_url,
    ${downloadedLiteral} AS downloaded_at,
    COUNT(*) AS row_count,
    COALESCE(MAX(accident_date), DATE '1970-01-01') AS latest_accident_date
  FROM crashes
) TO ${metaLiteral} (FORMAT JSON);
`;
}

async function runDuckDBScript(binary, sql) {
  await new Promise((resolve, reject) => {
    const child = spawn(binary, [DB_PATH], { stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", (error) => {
      reject(new Error(`Failed to run duckdb binary '${binary}'. Install DuckDB CLI and ensure it is in PATH. Original error: ${error.message}`));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`duckdb exited with code ${code}`));
      }
    });
    child.stdin.write(sql);
    child.stdin.end();
  });
}

async function readMetaRow(metaPath) {
  try {
    const raw = await readFile(metaPath, "utf8");
    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) {
      return null;
    }
    return JSON.parse(lines[0]);
  } catch (error) {
    throw new Error(`Unable to read meta output (${metaPath}): ${error.message}`);
  }
}

async function unlinkSafe(filePath) {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  console.error("Refresh failed:", error);
  process.exitCode = 1;
});
