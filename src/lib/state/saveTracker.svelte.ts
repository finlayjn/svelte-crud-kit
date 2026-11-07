import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { isRetryableError, retryDelay } from './retry.js';
import type { SaveMode } from './types.js';

/** The aggregate save state, preferring "saving" over "failed" over "pending" over "saved". */
export type SaveState = 'saved' | 'pending' | 'saving' | 'failed';

/** A function that persists one keyed edit. Its resolved value is ignored. */
export type Saver = () => Promise<unknown>;

export interface SaveTrackerOptions {
	/** Whether edits flush automatically (debounced) or only on an explicit {@link SaveTracker.flush}. */
	mode: SaveMode;
	/** Debounce window for autosave, in ms (default 700). Also the base of the retry backoff. */
	debounceMs?: number;
	/**
	 * Called when a keyed save fails (e.g. to show a toast): on the first failure of a key's streak,
	 * and on every failed explicit {@link SaveTracker.commit} / {@link SaveTracker.flush}. Automatic
	 * retries stay quiet. The edit is kept either way.
	 */
	onError?: (error: unknown, key: string) => void;
	/** Longest wait between automatic retries, in ms (default 30000). */
	retryMaxMs?: number;
	/** Whether a failed save should be retried automatically (default {@link isRetryableError}). */
	shouldRetry?: (error: unknown) => boolean;
}

type Trigger = 'user' | 'timer' | 'retry';

/**
 * A multi-key save engine for editing several independent things on one page — a collection of rows
 * (service log, hearings, …) or the distinct fields of a record — each saved on its own debounce.
 * It is the many-keyed sibling of {@link import('./autosave.svelte.js').AutosaveController} (which
 * saves a single record as one patch): here every key debounces, flushes, and reports independently,
 * while `state` / `dirty` aggregate across all of them for a single "Saving… / All changes saved"
 * indicator.
 *
 * You inject only the persistence: call {@link schedule} with a stable `key` (a row id, a field
 * name) and a {@link Saver} closure that sends that key's current value. In `autosave` mode the
 * write is debounced and committed automatically; in `manual` mode it is held until {@link flush}.
 *
 * ## Slow-connection safety (the reason this exists)
 * Saves for a given key are **serialized**: if a key's save is already in flight, a newer edit does
 * not start a second concurrent request — it is drained once the current one resolves. Overlapping
 * saves for the same key can otherwise resolve out of order and commit a stale value, which is a
 * real risk on a slow link where the debounce fires again long before the first save returns.
 *
 * ## Failures
 * In autosave mode a failed key is retried with exponential backoff (twice the debounce, doubling
 * up to `retryMaxMs`), unless the error won't succeed on a retry (see {@link isRetryableError}).
 * New edits to a key that is waiting to retry ride along with that retry.
 *
 * The tracker deliberately does **not** reconcile server responses back into your data — that is
 * caller-side, because it depends on how you hold the edited value. If your inputs `bind:` straight
 * to the object being saved, keystrokes typed during the round-trip mutate it live; folding a server
 * echo back in then would discard them (values snap back to stale). Guard your reconciliation with
 * "only apply the echo if this key has no newer pending edit", e.g. `if (!tracker.isPending(key))`.
 */
export class SaveTracker {
	/** Whether edits flush automatically (debounced) or only on an explicit {@link flush}. */
	readonly mode: SaveMode;
	/** The error from the latest failed save; cleared once no key is failing. */
	error = $state<unknown>(undefined);

	/** Keys with an edit waiting to be saved, mapped to the closure that persists them. */
	#pending = new SvelteMap<string, Saver>();
	/** Keys whose latest save failed. */
	#failedKeys = new SvelteSet<string>();
	// The collections below are internal bookkeeping only, never read from a derived or template.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive: timer handles only
	#timers = new Map<string, ReturnType<typeof setTimeout>>();
	/** Keys whose pending timer is a backoff retry (new edits don't shorten it). */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive: retry bookkeeping only
	#retrying = new Set<string>();
	/** Consecutive failures per key. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive: retry bookkeeping only
	#failures = new Map<string, number>();
	/** The running drain per key (serializes saves per key). */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive: in-flight guard only
	#inFlight = new Map<string, Promise<void>>();
	/** Number of keys currently saving (drives the "saving" state). */
	#saving = $state(0);
	#debounceMs: number;
	#retryMaxMs: number;
	#shouldRetry: (error: unknown) => boolean;
	#onError?: SaveTrackerOptions['onError'];
	#destroyed = false;

	constructor(options: SaveTrackerOptions) {
		this.mode = options.mode;
		this.#debounceMs = options.debounceMs ?? 700;
		this.#retryMaxMs = options.retryMaxMs ?? 30_000;
		this.#shouldRetry = options.shouldRetry ?? isRetryableError;
		this.#onError = options.onError;
	}

	/** The aggregate state, preferring "saving" over "failed" over "pending" over "saved". */
	get state(): SaveState {
		if (this.#saving > 0) return 'saving';
		if (this.failed) return 'failed';
		if (this.#pending.size > 0) return 'pending';
		return 'saved';
	}

	/** Whether any key has an edit that hasn't been persisted yet. */
	get dirty(): boolean {
		return this.#pending.size > 0;
	}

	/** True while any key is saving. */
	get saving(): boolean {
		return this.#saving > 0;
	}

	/** Whether any key's latest save failed and its edit is still unsaved. */
	get failed(): boolean {
		for (const key of this.#failedKeys) if (this.#pending.has(key)) return true;
		return false;
	}

	/** Whether a specific key has a not-yet-sent edit (use to guard echo reconciliation). */
	isPending(key: string): boolean {
		return this.#pending.has(key);
	}

	/** Whether a specific key's latest save failed and its edit is still unsaved. */
	isFailed(key: string): boolean {
		return this.#failedKeys.has(key) && this.#pending.has(key);
	}

	/**
	 * Registers an edit for `key`, persisted by `save`. In autosave mode the write is debounced and
	 * committed automatically; in manual mode it is held until {@link flush}. Rescheduling the same
	 * key replaces its pending saver and resets its debounce (idempotent per key).
	 */
	schedule(key: string, save: Saver): void {
		this.#pending.set(key, save);
		if (this.mode !== 'autosave' || this.#destroyed || this.#retrying.has(key)) return;
		this.#setTimer(key, this.#debounceMs, 'timer');
	}

	/**
	 * Commits one key's pending edit now, then drains any newer edits that arrived for the same key
	 * while it was in flight — all serialized, so a slow save never overlaps or reorders with the
	 * next. If the key is already saving, waits for that and then commits what's left. Resolves when
	 * done; never rejects (see `onError`).
	 */
	async commit(key: string): Promise<void> {
		this.#clearTimer(key);
		const running = this.#inFlight.get(key);
		if (running) {
			await running;
			return this.commit(key);
		}
		if (!this.#pending.has(key)) return;
		await this.#start(key, 'user');
	}

	/** Commits every outstanding edit at once (the manual-mode Save button). */
	async flush(): Promise<void> {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local de-duplication only
		const keys = new Set([...this.#pending.keys(), ...this.#inFlight.keys()]);
		await Promise.all([...keys].map((key) => this.commit(key)));
	}

	/**
	 * Stops timers and retries (call on navigation away / unmount). By default, in autosave mode,
	 * pending edits are committed one last time (fire and forget) instead of being dropped; pass
	 * `{ flush: false }` to discard them. Manual mode never flushes here.
	 */
	destroy(options: { flush?: boolean } = {}): void {
		const { flush = this.mode === 'autosave' } = options;
		this.#destroyed = true;
		for (const key of [...this.#timers.keys()]) this.#clearTimer(key);
		if (flush) void this.flush();
	}

	#setTimer(key: string, ms: number, trigger: Trigger): void {
		clearTimeout(this.#timers.get(key));
		if (trigger === 'retry') this.#retrying.add(key);
		this.#timers.set(
			key,
			setTimeout(() => this.#fire(key, trigger), ms)
		);
	}

	#clearTimer(key: string): void {
		clearTimeout(this.#timers.get(key));
		this.#timers.delete(key);
		this.#retrying.delete(key);
	}

	#fire(key: string, trigger: Trigger): void {
		this.#timers.delete(key);
		this.#retrying.delete(key);
		// A running drain picks up the newer edit itself once its current save resolves.
		if (this.#inFlight.has(key)) return;
		void this.#start(key, trigger);
	}

	#start(key: string, trigger: Trigger): Promise<void> {
		if (!this.#pending.has(key)) return Promise.resolve();
		this.#saving++;
		const run = this.#drain(key, trigger).finally(() => {
			this.#saving--;
			this.#inFlight.delete(key);
		});
		this.#inFlight.set(key, run);
		return run;
	}

	async #drain(key: string, trigger: Trigger): Promise<void> {
		let save = this.#pending.get(key);
		try {
			// Drain edits for this key until none newer arrived during the last round-trip.
			while (save) {
				this.#pending.delete(key);
				await save();
				this.#failures.delete(key);
				this.#failedKeys.delete(key);
				save = this.#pending.get(key);
			}
			if (this.#failedKeys.size === 0) this.error = undefined;
		} catch (error) {
			// Keep the failed edit (unless a newer one already superseded it) so it isn't lost.
			if (save && !this.#pending.has(key)) this.#pending.set(key, save);
			const failures = (this.#failures.get(key) ?? 0) + 1;
			this.#failures.set(key, failures);
			this.#failedKeys.add(key);
			this.error = error;
			if (trigger === 'user' || failures === 1) this.#onError?.(error, key);
			if (this.mode === 'autosave' && !this.#destroyed && this.#shouldRetry(error)) {
				this.#setTimer(key, retryDelay(failures, this.#debounceMs, this.#retryMaxMs), 'retry');
			}
		}
	}
}
