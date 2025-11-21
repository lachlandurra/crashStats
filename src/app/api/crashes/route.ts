import { NextResponse } from "next/server";
import type { Feature, MultiPolygon, Polygon } from "geojson";

import { validatePolygonFeature } from "@/lib/polygon";
import { consumeToken } from "@/lib/rate-limit";
import { queryCrashes } from "@/lib/crashes";
import type { SummaryFilters } from "@/lib/summary";

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
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let payload: RequestPayload;
  try {
    payload = (await request.json()) as RequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  let polygon: Feature<Polygon | MultiPolygon> | undefined;
  if (payload.polygon) {
    try {
      polygon = validatePolygonFeature(payload.polygon);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid polygon." }, { status: 400 });
    }
  }

  try {
    const crashes = await queryCrashes({ polygon, filters: payload.filters });
    return NextResponse.json({ results: crashes });
  } catch (error) {
    console.error("crashes_route_error", error);
    return NextResponse.json({ error: "Failed to fetch crashes." }, { status: 500 });
  }
}

function getIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "anonymous";
  }
  return request.headers.get("x-real-ip") ?? "anonymous";
}
