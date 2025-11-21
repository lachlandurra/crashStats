import path from "path";
import duckdb from "duckdb";

const DEFAULT_DB_PATH = process.env.DUCKDB_DATABASE ?? path.resolve("data/crashes.duckdb");

let sharedDatabase: duckdb.Database | null = null;
const spatialLoaded = new WeakSet<duckdb.Connection>();

function createDatabase(dbPath: string) {
  return new duckdb.Database(dbPath, { access_mode: "READ_ONLY" });
}

export function getDatabase(): duckdb.Database {
  if (!sharedDatabase) {
    sharedDatabase = createDatabase(DEFAULT_DB_PATH);
  }
  return sharedDatabase;
}

export async function withConnection<T>(
  fn: (connection: duckdb.Connection) => Promise<T>,
  options?: { database?: duckdb.Database }
): Promise<T> {
  const db = options?.database ?? getDatabase();
  const connection = db.connect();
  try {
    await ensureSpatial(connection);
    return await fn(connection);
  } finally {
    connection.close();
  }
}

async function ensureSpatial(connection: duckdb.Connection) {
  if (spatialLoaded.has(connection)) {
    return;
  }
  
  // In serverless environments (like Vercel), the home directory might be read-only.
  // We explicitly set the extension directory to /tmp which is writable.
  const os = await import("os");
  const fs = await import("fs");
  const extDir = path.join(os.tmpdir(), "duckdb_extensions");
  
  // Ensure the directory exists
  if (!fs.existsSync(extDir)) {
    fs.mkdirSync(extDir, { recursive: true });
  }

  try {
    await run(connection, `SET extension_directory='${extDir}';`);
    await run(connection, "LOAD spatial;");
  } catch {
    // First load may fail if the extension has not been installed yet.
    try {
      await run(connection, "INSTALL spatial;");
      await run(connection, "LOAD spatial;");
    } catch (error) {
      console.error("Failed to load spatial extension:", error);
      // Rethrow or handle gracefully? For now, we let it fail as spatial is required.
      throw error;
    }
  }
  spatialLoaded.add(connection);
}

export function run(connection: duckdb.Connection, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.run(sql, (error?: Error | null) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export function all<T = Record<string, unknown>>(
  connection: duckdb.Connection,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (!params.length) {
    return new Promise((resolve, reject) => {
      connection.all(sql, (error: Error | null | undefined, rows?: T[]) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows ?? []);
        }
      });
    });
  }

  return new Promise((resolve, reject) => {
    connection.prepare(sql, (prepError, statement) => {
      if (prepError || !statement) {
        reject(prepError);
        return;
      }
      statement.all(...params, (error: Error | null | undefined, rows?: T[]) => {
        statement.finalize();
        if (error) {
          reject(error);
        } else {
          resolve(rows ?? []);
        }
      });
    });
  });
}
