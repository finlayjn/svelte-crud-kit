import { SvelteMap } from 'svelte/reactivity';
import { isRetryableError, retryDelay } from './retry.js';
import type { SaveMode } from './types.js';

/**
 * A change that sets a value, checked against the value it started from. The server applies it
 * only if the stored value still equals `baseline`, and otherwise reports a conflict.
 */
export interface ValueChange {
	value: unknown;
	baseline: unknown;
}

/** What the server did with one change of a batch (same order as the changes sent). */
export type ChangeResult =
	| { status: 'saved'; value?: unknown }
	| { status: 'conflict'; current: unknown; updatedBy?: string | null }
	| { status: 'gone' }
	| { status: 'rejected'; message: string };

/** A change the server didn't apply, waiting for the user to decide. */
export interface ChangeProblem<TChange> {
	key: string;
	change: TChange;
	/** `conflict`: someone else changed it; `rejected`: refused; `gone`: its record was removed. */
	kind: 'conflict' | 'rejected' | 'gone';
	/** The stored value, for conflicts. */
	theirs: unknown;
	/** Who made the other change, when the server knows. */
	by: string | null;
	message: string | null;
}

export interface ChangeQueueOptions<TChange extends object> {
	/** Whether changes are sent automatically or only on {@link ChangeQueue.flush}. */
	mode: SaveMode;
	/** The key a change is stored under; a later change with the same key replaces it. */
	key: (change: TChange) => string;
	/**
	 * Sends a batch and returns one result per change, in order. Resolve only once the page shows
	 * the saved data (after reloading it), so saved values don't flash back to their old ones.
	 */
	save: (changes: TChange[]) => Promise<{ results: ChangeResult[] }>;
	/**
	 * Merges a conflicting edit with the stored value (e.g. a line-by-line text merge). Return the
	 * merged change, with `theirs` as its new baseline, to send it again at once; or `null` to list
	 * the conflict for the user.
	 */
	merge?: (sent: TChange, mine: TChange, theirs: unknown) => TChange | null;
	/**
	 * "Keep mine" for a conflict on a change that isn't a {@link ValueChange} (a removal that checks
	 * other values, say): returns the change re-based on what's stored now, or `null` to drop it.
	 */
	rebase?: (change: TChange) => TChange | null;
	/** Compares a value with its baseline to drop an edit that was undone (default `Object.is`). */
	equals?: (a: unknown, b: unknown) => boolean;
	/** Called once per run of failed saves (network or server errors), and for each failed flush. */
	onError?: (error: unknown) => void;
	/** Pause after typing before an autosave, in ms (default 1500); also the retry backoff base. */
	debounceMs?: number;
	/** Longest wait between automatic retries, in ms (default 30000). */
	retryMaxMs?: number;
	/** Whether a failed save is retried automatically (default {@link isRetryableError}). */
	shouldRetry?: (error: unknown) => boolean;
}

const isValueChange = (change: object): change is ValueChange =>
	'value' in change && 'baseline' in change;

/**
 * Unsaved edits to one record, keyed so a later edit of the same thing replaces the earlier one,
 * plus the edits the server didn't apply ({@link problems}), for the user to resolve.
 *
 * - In `autosave` mode edits are sent on their own: text after a pause ({@link setValue} with
 *   `immediate: false`), clicks at once. In `manual` mode only {@link flush} sends them (Save).
 * - One request is in flight at a time; edits made meanwhile go next.
 * - Value edits carry the value they started from, so a concurrent edit becomes a conflict
 *   instead of being overwritten. `merge` can resolve some automatically (text); the rest wait in
 *   {@link problems} for {@link keepMine} or {@link useTheirs}.
 * - Failures retry with backoff in autosave mode (except refused requests), and `onError` fires
 *   once per run of failures.
 *
 * It implements `SaveSource`, so a `SaveGroup` can aggregate it with other editors.
 */
export class ChangeQueue<TChange extends object> {
	readonly mode: SaveMode;
	/** Unsaved changes by key. */
	readonly pending = new SvelteMap<string, TChange>();
	/** Changes the server didn't apply, by key. */
	readonly problems = new SvelteMap<string, ChangeProblem<TChange>>();

	/** True while a save is in flight. */
	saving = $state(false);
	/** Whether a save has succeeded since the queue was created. */
	saved = $state(false);
	/** The last save failed with a network or server error (autosave retries it). */
	failing = $state(false);

	#opts: ChangeQueueOptions<TChange>;
	#debounceMs: number;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#failures = 0;
	#inflight: Promise<void> | null = null;
	#destroyed = false;
	/** Keys being saved right now; undoing one of them must still be sent. */
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping, never rendered
	#inflightKeys = new Set<string>();

	constructor(options: ChangeQueueOptions<TChange>) {
		this.#opts = options;
		this.mode = options.mode;
		this.#debounceMs = options.debounceMs ?? 1500;
	}

	/* ---------------------------------------------------------------- state */

	/** Unsaved changes or unresolved problems. */
	get dirty(): boolean {
		return this.pending.size > 0 || this.problems.size > 0;
	}

	/** Whether the latest save failed and its changes are still unsaved (for `SaveGroup`). */
	get failed(): boolean {
		return this.failing && this.pending.size > 0;
	}

	/**
	 * Whether leaving the page would lose something, for `useUnsavedGuard`: any unsaved change in
	 * manual mode; in autosave (which sends pending changes on the way out) only unresolved problems
	 * and failing saves.
	 */
	get blocksLeaving(): boolean {
		return this.mode === 'manual'
			? this.dirty
			: this.problems.size > 0 || (this.failing && this.pending.size > 0);
	}

	/** The unsaved change stored under `key`, if any. */
	get(key: string): TChange | undefined {
		return this.pending.get(key);
	}

	/** Whether `key` has an unsaved change. */
	isPending(key: string): boolean {
		return this.pending.has(key);
	}

	/* ------------------------------------------------------------- editing */

	/**
	 * Records a value edit against the value it started from. A later edit of the same key keeps
	 * the first baseline; an edit back to the baseline is dropped (unless it's being saved now, when
	 * the undo must still be sent). Clicks pass `immediate: true`; typing waits for a pause.
	 */
	setValue(change: TChange & ValueChange, options: { immediate?: boolean } = {}): void {
		const key = this.#opts.key(change);
		const existing = this.pending.get(key) as (TChange & ValueChange) | undefined;
		const baseline = existing ? existing.baseline : change.baseline;
		const next = { ...change, baseline } as TChange;
		if (this.problems.get(key)?.kind === 'rejected') this.problems.delete(key);
		const equals = this.#opts.equals ?? Object.is;
		const reverted = equals(change.value, baseline) && !this.problems.has(key);
		if (reverted && !this.#inflightKeys.has(key)) this.pending.delete(key);
		else this.pending.set(key, next);
		this.#schedule(options.immediate ? 0 : this.#debounceMs);
	}

	/** Stores any change (an add or removal) and, in autosave mode, sends it at once. */
	put(change: TChange): void {
		this.pending.set(this.#opts.key(change), change);
		this.#schedule(0);
	}

	/** Drops the unsaved change under `key`, if any. */
	drop(key: string): void {
		this.pending.delete(key);
	}

	/** Drops the unsaved change and any problem under `key`. */
	forget(key: string): void {
		this.pending.delete(key);
		this.problems.delete(key);
	}

	/** Sends what's pending (autosave) after the usual pause; for callers that edited via `drop`. */
	touch(): void {
		this.#schedule(0);
	}

	/** Drops every unsaved change and problem (manual mode's Discard). */
	discardAll(): void {
		clearTimeout(this.#timer);
		this.pending.clear();
		this.problems.clear();
	}

	/* ------------------------------------------------------------ problems */

	/** Saves your version over theirs. */
	keepMine(key: string): void {
		const problem = this.problems.get(key);
		const change = this.pending.get(key);
		this.problems.delete(key);
		if (!problem || !change) return;
		if (problem.kind === 'conflict' && isValueChange(change)) {
			this.pending.set(key, { ...change, baseline: problem.theirs } as TChange);
		} else if (problem.kind === 'conflict' && this.#opts.rebase) {
			const rebased = this.#opts.rebase(change);
			if (rebased) this.pending.set(key, rebased);
			else this.pending.delete(key);
		}
		void this.flush();
	}

	/** Drops your change and keeps what's saved. */
	useTheirs(key: string): void {
		this.problems.delete(key);
		this.pending.delete(key);
	}

	keepAllMine(): void {
		for (const [key, problem] of [...this.problems]) {
			if (problem.kind === 'conflict') this.keepMine(key);
		}
	}

	useAllTheirs(): void {
		for (const key of [...this.problems.keys()]) this.useTheirs(key);
	}

	/* -------------------------------------------------------------- saving */

	/** Saves on leaving a field (autosave only). */
	blur(): void {
		if (this.mode === 'autosave') void this.flush();
	}

	/**
	 * Sends every pending change that isn't waiting on a problem, and waits for it. If a save is in
	 * flight, waits for it first. Never rejects (see `onError`).
	 */
	async flush(): Promise<void> {
		clearTimeout(this.#timer);
		if (this.#inflight) {
			await this.#inflight;
			if (this.#sendable().length > 0) return this.flush();
			return;
		}
		const batch = this.#sendable();
		if (batch.length === 0) return;
		this.#inflight = this.#send(batch);
		try {
			await this.#inflight;
		} finally {
			this.#inflight = null;
		}
		// Edits made while the request was out go next.
		if (this.mode === 'autosave' && !this.failing && this.#sendable().length > 0) {
			this.#schedule(this.#debounceMs);
		}
	}

	/**
	 * Stops timers. In autosave mode pending changes are still sent (fire and forget), unless
	 * `flush: false`. Manual mode never sends here.
	 */
	destroy(options: { flush?: boolean } = {}): void {
		const { flush = this.mode === 'autosave' } = options;
		clearTimeout(this.#timer);
		this.#destroyed = true;
		if (flush && this.#sendable().length > 0) void this.flush();
	}

	#schedule(ms: number): void {
		if (this.mode !== 'autosave' || this.#destroyed) return;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => void this.flush(), ms);
	}

	#sendable(): [string, TChange][] {
		return [...this.pending].filter(([key]) => !this.problems.has(key));
	}

	async #send(batch: [string, TChange][]): Promise<void> {
		this.saving = true;
		for (const [key] of batch) this.#inflightKeys.add(key);
		try {
			const { results } = await this.#opts.save(batch.map(([, change]) => change));
			let merged = false;
			results.forEach((result, i) => {
				if (this.#settle(batch[i][0], batch[i][1], result)) merged = true;
			});
			this.failing = false;
			this.#failures = 0;
			// A clean merge was queued with their value as the new baseline; send it straight away.
			if (merged) queueMicrotask(() => void this.flush());
		} catch (error) {
			this.#failures++;
			if (!this.failing) this.#opts.onError?.(error);
			this.failing = true;
			const retry = this.#opts.shouldRetry ?? isRetryableError;
			if (this.mode === 'autosave' && !this.#destroyed && retry(error)) {
				clearTimeout(this.#timer);
				this.#timer = setTimeout(
					() => void this.flush(),
					retryDelay(this.#failures, this.#debounceMs / 2, this.#opts.retryMaxMs ?? 30_000)
				);
			}
		} finally {
			this.#inflightKeys.clear();
			this.saving = false;
		}
	}

	/** Applies one result. Returns whether a merged change was queued to resend. */
	#settle(key: string, sent: TChange, result: ChangeResult): boolean {
		const current = this.pending.get(key);
		const untouched = current === sent;
		switch (result.status) {
			case 'saved': {
				this.saved = true;
				if (untouched || !current) {
					this.pending.delete(key);
					return false;
				}
				// Edited again while saving: the saved value is the new starting point.
				if (isValueChange(current) && isValueChange(sent)) {
					const baseline = result.value ?? sent.value;
					const equals = this.#opts.equals ?? Object.is;
					if (equals(current.value, baseline)) this.pending.delete(key);
					else this.pending.set(key, { ...current, baseline } as TChange);
				}
				return false;
			}
			case 'conflict': {
				const change = current ?? sent;
				const merged = this.#opts.merge?.(sent, change, result.current) ?? null;
				if (merged) {
					this.pending.set(key, merged);
					return true;
				}
				this.problems.set(key, {
					key,
					change,
					kind: 'conflict',
					theirs: result.current,
					by: result.updatedBy ?? null,
					message: null
				});
				return false;
			}
			case 'gone':
				this.pending.delete(key);
				this.problems.set(key, {
					key,
					change: sent,
					kind: 'gone',
					theirs: null,
					by: null,
					message: null
				});
				return false;
			case 'rejected':
				this.problems.set(key, {
					key,
					change: current ?? sent,
					kind: 'rejected',
					theirs: null,
					by: null,
					message: result.message
				});
				return false;
		}
	}
}
