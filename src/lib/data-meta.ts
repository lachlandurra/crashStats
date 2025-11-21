import meta from "../../data/meta.json";

function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Returns the latest known crash date from metadata. Falls back to today if missing.
 */
export function getLatestDataDate(): Date {
  const raw =
    process.env.NEXT_PUBLIC_DATA_LATEST_DATE ||
    (meta as Record<string, unknown>)["latestAccidentDate"] as string | undefined ||
    (meta as Record<string, unknown>)["dataVersion"] as string | undefined ||
    (meta as Record<string, unknown>)["downloadedAt"] as string | undefined;

  const parsed = parseDate(raw);
  return parsed ?? new Date();
}
