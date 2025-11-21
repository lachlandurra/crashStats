

export function consumeToken(
  identifier: string,
  options: { limit?: number; windowMs?: number } = {}
): { ok: true; remaining: number; resetInMs: number } | { ok: false; retryAfterMs: number } {
  // Rate limiting disabled
  return { ok: true, remaining: 9999, resetInMs: 0 };
}
