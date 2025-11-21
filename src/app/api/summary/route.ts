import { NextResponse } from "next/server";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import { getDataVersionLabel } from "@/lib/data-version";
import { validatePolygonFeature } from "@/lib/polygon";
import { consumeToken } from "@/lib/rate-limit";
import { querySummary, type SummaryFilters } from "@/lib/summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestPayload = {
  polygon?: Feature<Polygon | MultiPolygon>;
  filters?: SummaryFilters;
};

export async function POST(request: Request) {
  const identifier = getIdentifier(request);
  const rateLimit = consumeToken(identifier, { limit: 60, windowMs: 60_000 });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1_000)).toString()
        }
      }
    );
  }

  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload?.polygon) {
    return NextResponse.json({ error: "Polygon is required." }, { status: 400 });
  }

  let polygon: Feature<Polygon | MultiPolygon>;
  try {
    polygon = validatePolygonFeature(payload.polygon);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid polygon." }, { status: 400 });
  }

  const filters = sanitizeFilters(payload.filters);

  try {
    const summary = await querySummary({ polygon, filters });
    const dataVersion = (await getDataVersionLabel()) ?? null;
    return NextResponse.json({ ...summary, dataVersion });
  } catch (error) {
    console.error("summary_route_error", error);
    return NextResponse.json({ error: "Failed to generate summary." }, { status: 500 });
  }
}

function getIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "anonymous";
  }
  return request.headers.get("x-real-ip") ?? "anonymous";
}

function sanitizeFilters(filters?: SummaryFilters): SummaryFilters | undefined {
  if (!filters) {
    return undefined;
  }

  const payload: SummaryFilters = {};

  if (filters.dateFrom && isIsoDate(filters.dateFrom)) {
    payload.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo && isIsoDate(filters.dateTo)) {
    payload.dateTo = filters.dateTo;
  }

  if (filters.severity?.length) {
    payload.severity = Array.from(
      new Set(
        filters.severity
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).slice(0, 20);
  }

  return Object.keys(payload).length ? payload : undefined;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
