import { NextResponse } from "next/server";
import { ensureConnected, getRedisClient, secondsUntilUtcMidnight } from "@/lib/redis";

const USER_AGENT = process.env.NEXT_PUBLIC_APP_NAME
  ? `${process.env.NEXT_PUBLIC_APP_NAME} (contact: dev@localhost)`
  : "crashstats (contact: dev@localhost)";

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const REQUEST_TIMEOUT_MS = 8000;
// Bias around Melbourne to improve relevance
const MELBOURNE_PROXIMITY = "144.9631,-37.8136";
const MELBOURNE_BBOX = "144.0,-38.5,145.8,-37.4";
const DAILY_LIMIT = Number(process.env.MAPBOX_MAX_DAILY_REQUESTS ?? "0");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing search query" }, { status: 400 });
  }
  if (!MAPBOX_TOKEN) {
    console.error("geocode_proxy_error", "Missing MAPBOX_ACCESS_TOKEN");
    return NextResponse.json({ error: "Geocoding unavailable (no token configured)." }, { status: 500 });
  }

  try {
    if (DAILY_LIMIT > 0) {
      const redis = getRedisClient();
      if (!redis) {
        console.warn("[geocode] Redis not configured; daily cap disabled.");
      } else {
        await ensureConnected(redis);
        const todayKey = `geocode:mapbox:${new Date().toISOString().slice(0, 10)}`;
        const count = await redis.incr(todayKey);
        if (count === 1) {
          await redis.expire(todayKey, secondsUntilUtcMidnight());
        }
        if (count > DAILY_LIMIT) {
          return NextResponse.json({ error: "Geocoding temporarily disabled (daily limit reached)." }, { status: 429 });
        }
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
    url.searchParams.set("access_token", MAPBOX_TOKEN);
    url.searchParams.set("limit", "5");
    url.searchParams.set("autocomplete", "true");
    url.searchParams.set("country", "AU");
    url.searchParams.set("proximity", MELBOURNE_PROXIMITY);
    url.searchParams.set("bbox", MELBOURNE_BBOX);

    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT
      },
      cache: "no-store",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Geocoding failed" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("geocode_proxy_error", error);
    if (error?.name === "AbortError") {
      return NextResponse.json({ error: "Geocoding timed out. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Geocoding request failed" }, { status: 502 });
  }
}
