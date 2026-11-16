type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
// Keys can be attacker-chosen (e.g. rotating login names), so the map must not
// grow forever: past this size expired buckets are dropped, then the oldest.
const MAX_BUCKETS = 10_000;

function prune(now: number) {
  for (const [key, bucket] of buckets) if (bucket.resetAt < now) buckets.delete(key);
  if (buckets.size < MAX_BUCKETS) return;
  let toDrop = buckets.size - MAX_BUCKETS / 2;
  for (const key of buckets.keys()) {
    if (toDrop-- <= 0) break;
    buckets.delete(key);
  }
}

// In-memory only — fine for a single persistent Node process (see README
// "Деплой"); would need a shared store (Redis etc.) behind a load balancer.
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    if (buckets.size >= MAX_BUCKETS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() ?? "unknown";
}
