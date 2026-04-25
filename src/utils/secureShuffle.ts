/**
 * secureShuffle — Fisher-Yates shuffle backed by `crypto.getRandomValues`.
 *
 * Why this exists:
 *   The common pattern `[...arr].sort(() => Math.random() - 0.5)` is a known
 *   biased shuffle. In V8 (Chrome/Deno), the comparator's non-transitive
 *   behavior produces VERY repetitive orderings — same teams keep landing in
 *   the same brackets, breaking the "real draw" feel.
 *
 *   This module gives us:
 *     - Mathematically uniform Fisher-Yates
 *     - Cryptographically strong randomness via WebCrypto
 *     - A single source of truth used by every fixture/draw generator
 *     - Each call uses fresh entropy → impossible to "remember" the previous
 *       order
 */

/** Returns a uniformly random integer in [0, max) using crypto. */
function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  if (max === 1) return 0;
  // Use 32-bit unsigned integers and rejection sample to avoid modulo bias.
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xFFFFFFFF / max) * max;
  // Bounded retry — limit is always > 0 because max <= 2^32-1
  for (let i = 0; i < 16; i++) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
  // Extremely unlikely fallback
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

/**
 * Returns a NEW array with the elements of `arr` in a uniformly random order.
 * Original array is not mutated. Empty / single-item arrays are returned as-is.
 */
export function secureShuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    if (j !== i) {
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
  }
  return out;
}

/** Picks one element uniformly at random. Returns undefined for empty arrays. */
export function securePick<T>(arr: readonly T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[secureRandomInt(arr.length)];
}
