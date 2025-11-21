import { describe, expect, it } from "vitest";
import duckdb from "duckdb";
import { polygon } from "@turf/helpers";

import { run } from "./duckdb";
import { querySummary, type SummaryFilters } from "./summary";

const melbournePolygon = polygon([
  [
    [144.85, -38.2],
    [145.25, -38.2],
    [145.25, -37.6],
    [144.85, -37.6],
    [144.85, -38.2]
  ]
]);

async function createTestDatabase() {
  const db = new duckdb.Database(":memory:");
  const connection = db.connect();
  await run(connection, "INSTALL spatial;");
  await run(connection, "LOAD spatial;");
  await run(
    connection,
    `
    CREATE TABLE crashes (
      accident_no TEXT,
      accident_date DATE,
      accident_time VARCHAR,
      accident_type TEXT,
      severity TEXT,
      day_of_week TEXT,
      speed_zone INTEGER,
      light_condition TEXT,
      road_geometry TEXT,
      total_persons INTEGER,
      bicyclist_count INTEGER,
      pedestrian_count INTEGER,
      heavy_vehicle_count INTEGER,
      geom GEOMETRY
    );
  `
  );

  await run(
    connection,
    `
    INSERT INTO crashes VALUES
    (
      'A1',
      DATE '2024-01-01',
      '12:00:00',
      'Rear-end',
      'Fatal',
      'Monday',
      50,
      'Day',
      'Cross intersection',
      3,
      0,
      1,
      0,
      ST_Point(145.0, -37.8)
    ),
    (
      'A2',
      DATE '2024-01-02',
      '13:00:00',
      'Head-on',
      'Serious Injury',
      'Tuesday',
      60,
      'Night',
      'T intersection',
      2,
      1,
      0,
      1,
      ST_Point(145.1, -37.9)
    ),
    (
      'A3',
      DATE '2023-05-04',
      '09:00:00',
      'Side collision',
      'Other injury',
      'Friday',
      60,
      'Day',
      'Curve',
      1,
      0,
      0,
      0,
      ST_Point(144.2, -36.9)
    );
  `
  );

  connection.close();
  return db;
}

async function runSummary(filters?: SummaryFilters) {
  const db = await createTestDatabase();
  return querySummary({ polygon: melbournePolygon, filters, database: db });
}

describe("querySummary", () => {
  it("returns totals and groupings within the polygon", async () => {
    const summary = await runSummary();
    expect(summary.total).toBe(2);
    expect(summary.bySeverity).toEqual(
      expect.arrayContaining([
        { bucket: "Fatal", count: 1 },
        { bucket: "Serious Injury", count: 1 }
      ])
    );
    expect(summary.byType[0]?.bucket).toBeDefined();
    expect(summary.latestAccidentDate).toBe("2024-01-02");
  });

  it("applies severity filter", async () => {
    const summary = await runSummary({ severity: ["Fatal"] });
    expect(summary.total).toBe(1);
    expect(summary.bySeverity).toEqual([{ bucket: "Fatal", count: 1 }]);
  });

  it("applies date range filters", async () => {
    const summary = await runSummary({ dateFrom: "2024-01-02", dateTo: "2024-12-31" });
    expect(summary.total).toBe(1);
    expect(summary.bySeverity[0]).toEqual({ bucket: "Serious Injury", count: 1 });
  });
});
