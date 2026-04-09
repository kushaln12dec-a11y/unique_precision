import { Redis } from "@upstash/redis";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: Redis | null;
};

const createRedisClient = () => {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();

  if (!url || !token) {
    console.warn("UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Cache fallback will be used.");
    return null;
  }

  return new Redis({ url, token });
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis ?? null;
}

type MemoryEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryEntry>();

export const CACHE_KEYS = {
  MASTER_CONFIG: "master_config:global",
  DASHBOARD: (role: string, params: string) => `dashboard:${role}:${params}`,
} as const;

export const CACHE_TTL = {
  MASTER_CONFIG: Math.max(60, Number(process.env.MASTER_CONFIG_CACHE_TTL_SECONDS || 300)),
  DASHBOARD: Math.max(15, Number(process.env.DASHBOARD_CACHE_TTL_SECONDS || 60)),
} as const;

const getTtlForKey = (key: string) =>
  key.startsWith(CACHE_KEYS.MASTER_CONFIG) ? CACHE_TTL.MASTER_CONFIG : CACHE_TTL.DASHBOARD;

const getMemoryValue = <T>(key: string): T | null => {
  const existing = memoryCache.get(key);
  if (!existing) return null;
  if (existing.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  try {
    return JSON.parse(existing.value) as T;
  } catch {
    memoryCache.delete(key);
    return null;
  }
};

const setMemoryValue = (key: string, value: unknown, ttlSeconds: number) => {
  memoryCache.set(key, {
    value: JSON.stringify(value),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) {
    return getMemoryValue<T>(key);
  }

  try {
    const value = await redis.get<T>(key);
    if (value !== null && value !== undefined) {
      setMemoryValue(key, value, getTtlForKey(key));
      return value;
    }
  } catch (err) {
    console.error("Redis GET error:", err);
  }

  return getMemoryValue<T>(key);
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  setMemoryValue(key, value, ttlSeconds);

  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error("Redis SET error:", err);
  }
}

export async function cacheDel(key: string): Promise<void> {
  memoryCache.delete(key);

  if (!redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    console.error("Redis DEL error:", err);
  }
}
