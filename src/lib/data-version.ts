import { promises as fs } from "fs";
import path from "path";

const META_PATH = path.resolve("data/meta.json");
let cached: { mtimeMs: number; value: string | null } | null = null;

export async function getDataVersionLabel(): Promise<string | null> {
  try {
    const stats = await fs.stat(META_PATH);
    if (cached && cached.mtimeMs === stats.mtimeMs) {
      return cached.value;
    }
    const raw = await fs.readFile(META_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const value =
      parsed.dataVersion ??
      parsed.data_version ??
      parsed.data_version_label ??
      parsed.latestAccidentDate ??
      parsed.latest_accident_date ??
      null;
    cached = { mtimeMs: stats.mtimeMs, value };
    return value;
  } catch {
    return process.env.NEXT_PUBLIC_DATA_VERSION ?? null;
  }
}
