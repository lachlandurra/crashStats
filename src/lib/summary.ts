import type { Feature, MultiPolygon, Polygon } from "geojson";
import duckdb from "duckdb";

import { all, withConnection } from "./duckdb";

export type SummaryFilters = {
  severity?: string[];
  dateFrom?: string;
  dateTo?: string;
};

export type SummaryBucket = {
  bucket: string;
  count: number;
};

export type SummaryResult = {
  total: number;
  bySeverity: SummaryBucket[];
  byType: SummaryBucket[];
  bySpeedZone: SummaryBucket[];
  byRoadGeometry: SummaryBucket[];
  byDayOfWeek: SummaryBucket[];
  byLightCondition: SummaryBucket[];
  totals: {
    persons: number;
    pedestrians: number;
    cyclists: number;
    heavyVehicles: number;
  };
  latestAccidentDate: string | null;
};

type QueryOptions = {
  polygon: Feature<Polygon | MultiPolygon>;
  filters?: SummaryFilters;
  database?: duckdb.Database;
};

export async function querySummary(options: QueryOptions): Promise<SummaryResult> {
  const polygonGeometry = JSON.stringify(options.polygon.geometry);
  const { filterSql, filterParams } = buildFilterClause(options.filters);
  const params = [polygonGeometry, ...filterParams];

  return withConnection(
    async (connection) => {
      const cte = buildFilteredCte(filterSql);
      const total = await all<{ count: number }>(connection, `${cte} SELECT COUNT(*) AS count FROM filtered;`, [
        ...params
      ]);
      const bySeverity = await all<{ severity: string | null; count: number }>(
        connection,
        `${cte}
        SELECT COALESCE(severity, 'Unknown') AS severity, COUNT(*) AS count
        FROM filtered
        GROUP BY 1
        ORDER BY count DESC;`,
        [...params]
      );
      const byType = await all<{ accident_type: string | null; count: number }>(
        connection,
        `${cte}
        SELECT COALESCE(accident_type, 'Unknown') AS accident_type, COUNT(*) AS count
        FROM filtered
        GROUP BY 1
        ORDER BY count DESC;`,
        [...params]
      );
      const latest = await all<{ latest: string | null }>(
        connection,
        `${cte} SELECT MAX(accident_date)::VARCHAR AS latest FROM filtered;`,
        [...params]
      );
      const bySpeedZone = await all<{ bucket_value: string | null; count: number }>(
        connection,
        `${cte}
        SELECT COALESCE(CAST(speed_zone AS VARCHAR), 'Unknown') AS bucket_value, COUNT(*) AS count
        FROM filtered
        GROUP BY 1
        ORDER BY count DESC;`,
        [...params]
      );
      const byRoadGeometry = await all<{ bucket_value: string | null; count: number }>(
        connection,
        `${cte}
        SELECT COALESCE(road_geometry, 'Unknown') AS bucket_value, COUNT(*) AS count
        FROM filtered
        GROUP BY 1
        ORDER BY count DESC;`,
        [...params]
      );
      const byDayOfWeek = await all<{ bucket_value: string | null; count: number }>(
        connection,
        `${cte}
        SELECT COALESCE(day_of_week, 'Unknown') AS bucket_value, COUNT(*) AS count
        FROM filtered
        GROUP BY 1
        ORDER BY count DESC;`,
        [...params]
      );
      const byLightCondition = await all<{ bucket_value: string | null; count: number }>(
        connection,
        `${cte}
        SELECT COALESCE(light_condition, 'Unknown') AS bucket_value, COUNT(*) AS count
        FROM filtered
        GROUP BY 1
        ORDER BY count DESC;`,
        [...params]
      );
      const totals = await all<{ persons: number; pedestrians: number; cyclists: number; heavyVehicles: number }>(
        connection,
        `${cte}
        SELECT
          COALESCE(SUM(total_persons), 0) AS persons,
          COALESCE(SUM(pedestrian_count), 0) AS pedestrians,
          COALESCE(SUM(bicyclist_count), 0) AS cyclists,
          COALESCE(SUM(heavy_vehicle_count), 0) AS heavyVehicles
        FROM filtered;`,
        [...params]
      );

      return {
        total: Number(total[0]?.count ?? 0),
        bySeverity: formatBuckets(bySeverity, "severity"),
        byType: formatBuckets(byType, "accident_type"),
        bySpeedZone: formatBuckets(bySpeedZone, "bucket_value"),
        byRoadGeometry: formatBuckets(byRoadGeometry, "bucket_value"),
        byDayOfWeek: formatBuckets(byDayOfWeek, "bucket_value"),
        byLightCondition: formatBuckets(byLightCondition, "bucket_value"),
        totals: {
          persons: Number(totals[0]?.persons ?? 0),
          pedestrians: Number(totals[0]?.pedestrians ?? 0),
          cyclists: Number(totals[0]?.cyclists ?? 0),
          heavyVehicles: Number(totals[0]?.heavyVehicles ?? 0)
        },
        latestAccidentDate: latest[0]?.latest ?? null
      };
    },
    { database: options.database }
  );
}

function buildFilteredCte(filterSql: string) {
  const whereClause = filterSql ? ` AND ${filterSql}` : "";
  return `
WITH
  input AS (SELECT ST_GeomFromGeoJSON(?) AS geom),
  filtered AS (
    SELECT crashes.*
    FROM crashes, input
    WHERE crashes.geom IS NOT NULL
      AND ST_Intersects(crashes.geom, input.geom)
      ${whereClause}
  )
`;
}

function buildFilterClause(filters: SummaryFilters | undefined) {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.dateFrom) {
    clauses.push("accident_date >= ?");
    params.push(filters.dateFrom);
  }

  if (filters?.dateTo) {
    clauses.push("accident_date <= ?");
    params.push(filters.dateTo);
  }

  const severityValues = uniq(
    (filters?.severity ?? [])
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
  );

  if (severityValues.length > 0) {
    const placeholders = severityValues.map(() => "?").join(", ");
    clauses.push(`severity IN (${placeholders})`);
    params.push(...severityValues);
  }

  return {
    filterSql: clauses.join(" AND "),
    filterParams: params
  };
}

function formatBuckets(rows: Array<{ count: number; [key: string]: unknown }>, key: string): SummaryBucket[] {
  return rows.map((row) => ({
    bucket: String(row[key] ?? "Unknown"),
    count: Number(row.count ?? 0)
  }));
}

function uniq(values: string[]) {
  return Array.from(new Set(values));
}
