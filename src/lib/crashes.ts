import type { Feature, MultiPolygon, Polygon } from "geojson";
import duckdb from "duckdb";

import { all, withConnection } from "./duckdb";

import type { SummaryFilters } from "./summary";

export type CrashPoint = {
  accidentNo: string;
  accidentDate: string | null;
  severity: string | null;
  accidentType: string | null;
  lon: number;
  lat: number;
  speedZone: string | null;
  roadGeometry: string | null;
  dayOfWeek: string | null;
  lightCondition: string | null;
  totalPersons: number;
  pedestrians: number;
  cyclists: number;
  heavyVehicles: number;
  passengerVehicles: number;
  motorcycles: number;
  publicTransportVehicles: number;
  passengers: number;
  drivers: number;
  pillions: number;
  motorcyclists: number;
  unknown: number;
  pedCyclist5To12: number;
  pedCyclist13To18: number;
  oldPed65Plus: number;
  oldDriver75Plus: number;
  youngDriver18To25: number;
  noOfVehicles: number;
};

type CrashQueryOptions = {
  polygon?: Feature<Polygon | MultiPolygon> | null;
  filters?: SummaryFilters;
  limit?: number;
  database?: duckdb.Database;
};

export async function queryCrashes(options: CrashQueryOptions): Promise<CrashPoint[]> {
  const limit = Math.min(Math.max(options.limit ?? 5000, 1), 5000);
  const { filterSql, filterParams } = buildFilterClause(options.filters);
  const params = options.polygon ? [JSON.stringify(options.polygon.geometry), ...filterParams, limit] : [...filterParams, limit];

  return withConnection(
    async (connection) => {
      const cte = buildFilteredCte({ polygon: options.polygon, filterSql });
      const rows = await all<any>(connection, `${cte} SELECT * FROM filtered_limited;`, params);
      return rows.map((row) => ({
        accidentNo: String(row.accidentNo ?? row.accidentno ?? ""),
        accidentDate: row.accidentDate ?? null,
        severity: row.severity ?? null,
        accidentType: row.accidentType ?? null,
        lon: Number(row.lon),
        lat: Number(row.lat),
        speedZone: row.speedZone ?? null,
        roadGeometry: row.roadGeometry ?? null,
        dayOfWeek: row.dayOfWeek ?? null,
        lightCondition: row.lightCondition ?? null,
        totalPersons: Number(row.totalPersons ?? 0),
        pedestrians: Number(row.pedestrians ?? 0),
        cyclists: Number(row.cyclists ?? 0),
        heavyVehicles: Number(row.heavyVehicles ?? 0),
        passengerVehicles: Number(row.passengerVehicles ?? 0),
        motorcycles: Number(row.motorcycles ?? 0),
        publicTransportVehicles: Number(row.publicTransportVehicles ?? 0),
        passengers: Number(row.passengers ?? 0),
        drivers: Number(row.drivers ?? 0),
        pillions: Number(row.pillions ?? 0),
        motorcyclists: Number(row.motorcyclists ?? 0),
        unknown: Number(row.unknown ?? 0),
        pedCyclist5To12: Number(row.pedCyclist5To12 ?? 0),
        pedCyclist13To18: Number(row.pedCyclist13To18 ?? 0),
        oldPed65Plus: Number(row.oldPed65Plus ?? 0),
        oldDriver75Plus: Number(row.oldDriver75Plus ?? 0),
        youngDriver18To25: Number(row.youngDriver18To25 ?? 0),
        noOfVehicles: Number(row.noOfVehicles ?? 0),
      }));
    },
    { database: options.database }
  );
}

function buildFilteredCte({
  polygon,
  filterSql
}: {
  polygon?: Feature<Polygon | MultiPolygon> | null;
  filterSql: string;
}) {
  const filterCondition = filterSql ? ` AND ${filterSql}` : "";
  
  // Common columns to select
  const columns = `
    crashes.accident_no AS accidentNo,
    crashes.accident_date::VARCHAR AS accidentDate,
    crashes.accident_type AS accidentType,
    crashes.severity,
    crashes.speed_zone AS speedZone,
    crashes.road_geometry AS roadGeometry,
    crashes.day_of_week AS dayOfWeek,
    crashes.light_condition AS lightCondition,
    crashes.total_persons AS totalPersons,
    crashes.pedestrian_count AS pedestrians,
    crashes.bicyclist_count AS cyclists,
    crashes.heavy_vehicle_count AS heavyVehicles,
    crashes.passenger_vehicle_count AS passengerVehicles,
    crashes.motorcycle_count AS motorcycles,
    crashes.public_transport_vehicle_count AS publicTransportVehicles,
    crashes.passenger_count AS passengers,
    crashes.driver_count AS drivers,
    crashes.pillion_count AS pillions,
    crashes.motorcyclist_count AS motorcyclists,
    crashes.unknown_count AS unknown,
    crashes.ped_cyclist_5_12 AS pedCyclist5To12,
    crashes.ped_cyclist_13_18 AS pedCyclist13To18,
    crashes.old_ped_65_and_over AS oldPed65Plus,
    crashes.old_driver_75_and_over AS oldDriver75Plus,
    crashes.young_driver_18_25 AS youngDriver18To25,
    crashes.no_of_vehicles AS noOfVehicles,
    ST_X(crashes.geom) AS lon,
    ST_Y(crashes.geom) AS lat
  `;

  if (polygon) {
    return `
WITH
  input AS (SELECT ST_GeomFromGeoJSON(?) AS geom),
  filtered AS (
    SELECT
      ${columns}
    FROM crashes, input
    WHERE crashes.geom IS NOT NULL
      AND ST_Intersects(crashes.geom, input.geom)
      ${filterCondition}
  ),
  filtered_limited AS (
    SELECT *
    FROM filtered
    ORDER BY accidentDate DESC NULLS LAST
    LIMIT ?
  )
`;
  }

  return `
WITH
  filtered AS (
    SELECT
      ${columns}
    FROM crashes
    WHERE crashes.geom IS NOT NULL
      ${filterCondition}
  ),
  filtered_limited AS (
    SELECT *
    FROM filtered
    ORDER BY accidentDate DESC NULLS LAST
    LIMIT ?
  )
`;
}

function buildFilterClause(filters: SummaryFilters | undefined) {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters?.dateFrom) {
    clauses.push("crashes.accident_date >= ?");
    params.push(filters.dateFrom);
  }

  if (filters?.dateTo) {
    clauses.push("crashes.accident_date <= ?");
    params.push(filters.dateTo);
  }

  const severityValues = Array.from(
    new Set(
      (filters?.severity ?? [])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );

  if (severityValues.length) {
    const placeholders = severityValues.map(() => "?").join(", ");
    clauses.push(`crashes.severity IN (${placeholders})`);
    params.push(...severityValues);
  }

  return {
    filterSql: clauses.join(" AND "),
    filterParams: params
  };
}
