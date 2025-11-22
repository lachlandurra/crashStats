import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;
let warned = false;

export function getRedisClient(): RedisClientType | null {
  if (client) return client;

  const url = process.env.REDIS_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) {
    if (!warned) {
      console.warn("[redis] REDIS_URL not set; skipping Redis features.");
      warned = true;
    }
    return null;
  }

  try {
    client = createClient({
      url
    });
    client.on("error", (err) => console.error("[redis] client error", err));
  } catch (error) {
    console.error("[redis] failed to create client", error);
    client = null;
  }
  return client;
}

export async function ensureConnected(redis: RedisClientType) {
  if (redis.isOpen || redis.isReady) return;
  try {
    await redis.connect();
  } catch (error) {
    console.error("[redis] connect error", error);
    throw error;
  }
}

export function secondsUntilUtcMidnight() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return Math.max(1, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}
