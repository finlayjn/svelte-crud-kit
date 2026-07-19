import { SvelteMap } from 'svelte/reactivity';
import type { SaveMode } from './editDraft.svelte.js';

/** The aggregate save state, preferring "saving" over "pending" over "saved". */
export type SaveState = 'saved' | 'pending' | 'saving';

/** A function that persists one keyed edit. Its resolved value is ignored. */
export type Saver = () => Promise<unknown>;

export interface SaveTrackerOptions {
	/** Whether edits flush automatically (debounced) or only on an explicit {@link SaveTracker.flush}. */
	mode: SaveMode;
	/** Debounce window for autosave, in ms (default 700). */
	debounceMs?: number;
	/** Called when a keyed save throws (e.g. to show a toast). The edit is kept and retried. */
	onError?: (error: unknown, key: string) => void;
}

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
 * Saves for a given key are **serialised**: if a key's save is already in flight, a newer edit does
 * not start a second concurrent request — it is drained once the current one resolves. Overlapping
 * saves for the same key can otherwise resolve out of order and commit a stale value, which is a
 * real risk on a slow link where the debounce fires again long before the first save returns.
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

	/** Keys with an edit waiting to be saved, mapped to the closure that persists them. */
	#pending = new SvelteMap<string, Saver>();
	// The two collections below are internal bookkeeping only — never read from a derived/template —
	// so they deliberately stay plain (non-reactive); `#pending` above is what drives `state`/`dirty`.
	/** Live debounce timers (autosave mode only), so rescheduling a key resets its timer. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive: timer handles only
	#timers = new Map<string, ReturnType<typeof setTimeout>>();
	/** Keys whose save is currently in flight (serialises saves per key). */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive: in-flight guard only
	#inFlight = new Set<string>();
	/** Number of keys currently saving (drives the "saving" state). */
	#saving = $state(0);
	#debounceMs: number;
	#onError?: SaveTrackerOptions['onError'];

	constructor(options: SaveTrackerOptions) {
		this.mode = options.mode;
		this.#debounceMs = options.debounceMs ?? 700;
		this.#onError = options.onError;
	}

	/** The aggregate state, preferring "saving" over "pending" over "saved". */
	get state(): SaveState {
		if (this.#saving > 0) return 'saving';
		if (this.#pending.size > 0) return 'pending';
		return 'saved';
	}

	/** Whether any key has an edit that hasn't been persisted yet. */
	get dirty(): boolean {
		return this.#pending.size > 0;
	}

	/** Whether a specific key has a not-yet-sent edit (use to guard echo reconciliation). */
	isPending(key: string): boolean {
		return this.#pending.has(key);
	}

	/**
	 * Registers an edit for `key`, persisted by `save`. In autosave mode the write is debounced and
	 * committed automatically; in manual mode it is held until {@link flush}. Rescheduling the same
	 * key replaces its pending saver and resets its debounce (idempotent per key).
	 */
	schedule(key: string, save: Saver): void {
		this.#pending.set(key, save);
		if (this.mode === 'autosave') {
			clearTimeout(this.#timers.get(key));
			this.#timers.set(
				key,
				setTimeout(() => void this.commit(key), this.#debounceMs)
			);
		}
	}

	/**
	 * Commits one key's pending edit now, then drains any newer edits that arrived for the same key
	 * while it was in flight — all serialised, so a slow save never overlaps or reorders with the
	 * next. A no-op if the key has nothing pending or is already being drained by another `commit`.
	 */
	async commit(key: string): Promise<void> {
		clearTimeout(this.#timers.get(key));
		this.#timers.delete(key);
		// Already saving this key: leave the newer edit pending; the in-flight loop below will drain it.
		if (this.#inFlight.has(key)) return;

		let save = this.#pending.get(key);
		if (!save) return;

		this.#inFlight.add(key);
		this.#saving++;
		try {
			// Drain edits for this key until none newer arrived during the last round-trip.
			while (save) {
				this.#pending.delete(key);
				await save();
				save = this.#pending.get(key);
			}
		} catch (error) {
			// Keep the failed edit (unless a newer one already superseded it) so it isn't lost.
			if (save && !this.#pending.has(key)) this.#pending.set(key, save);
			this.#onError?.(error, key);
			if (this.mode === 'autosave') this.#arm(key);
		} finally {
			this.#inFlight.delete(key);
			this.#saving--;
		}
	}

	/** Commits every outstanding edit at once (the manual-mode Save button). */
	async flush(): Promise<void> {
		await Promise.all([...this.#pending.keys()].map((key) => this.commit(key)));
	}

	/** Cancels any pending debounce timers (call on navigation away / unmount). */
	destroy(): void {
		for (const timer of this.#timers.values()) clearTimeout(timer);
		this.#timers.clear();
	}

	/** Re-arms a key's autosave debounce (used to retry after an error). */
	#arm(key: string): void {
		clearTimeout(this.#timers.get(key));
		this.#timers.set(
			key,
			setTimeout(() => void this.commit(key), this.#debounceMs)
		);
	}
}
