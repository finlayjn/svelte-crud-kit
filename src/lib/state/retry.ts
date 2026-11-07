/**
 * Whether a failed save is worth retrying. An error carrying a numeric `status` from 400 to 499
 * (SvelteKit's `HttpError` has one) means the request itself was rejected, so sending it again
 * won't help. 408 (timeout) and 429 (rate limited) are the exceptions and are retried. Anything
 * else (network failures, 5xx) is retried.
 */
export function isRetryableError(error: unknown): boolean {
	const status = (error as { status?: unknown } | null | undefined)?.status;
	if (typeof status !== 'number') return true;
	if (status === 408 || status === 429) return true;
	return status < 400 || status > 499;
}

/** Backoff delay before retry number `failures` (1-based): `base * 2^failures`, capped at `max`. */
export function retryDelay(failures: number, base: number, max: number): number {
	return Math.min(max, base * 2 ** failures);
}
