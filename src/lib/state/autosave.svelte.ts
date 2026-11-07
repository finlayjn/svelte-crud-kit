import { isRetryableError, retryDelay } from './retry.js';
import type { SaveMode } from './types.js';

/**
 * A framework-agnostic save *engine* for editable detail pages: debounced autosave, single-flight
 * de-duplication, retry with backoff, and the `dirty` / `saving` / `failed` / `lastSavedAt`
 * indicators — without knowing anything about your record shape.
 *
 * You inject the two domain pieces:
 *  - {@link AutosaveOptions.getPatch} reads your reactive draft/baseline and returns the patch to
 *    send (or `null` when nothing changed). Because it reads reactive state, `pendingPatch` and
 *    `dirty` update automatically as the user types.
 *  - {@link AutosaveOptions.save} performs the request; {@link AutosaveOptions.applyResult} folds the
 *    response back into your drafts/baselines (e.g. advancing baselines, reconciling conflicts).
 *
 * Wire fields to call {@link scheduleFlush} on change (debounced autosave; a no-op in manual mode),
 * and a Save button to call {@link flush} (sends immediately). Conflict handling, if you need it,
 * lives in your `getPatch` / `applyResult` — this engine deliberately stays out of it.
 *
 * Failures: in autosave mode a failed save is retried with exponential backoff (twice the debounce,
 * doubling up to {@link AutosaveOptions.retryMaxMs}), unless the error won't succeed on a retry (see
 * {@link isRetryableError}). `failed` and `error` describe the current failure streak, and
 * `onError` fires once per streak plus once for every failed explicit {@link flush}.
 *
 * Avoiding autosave loops: when `applyResult` advances baselines for the fields a save accepted,
 * rebaseline them from the values you *sent*, not from the echoed server row. A server echo can
 * differ from what you wrote (value coercion, read-after-write replica lag), and rebaselining from it
 * leaves a phantom `draft ≠ baseline` diff that keeps {@link AutosaveController.dirty} true and
 * re-arms the flush forever. The server accepted the patch, so the committed value is exactly what
 * you sent.
 */
export interface AutosaveOptions<TPatch, TResult> {
	/** Whether edits flush automatically (debounced) or only on an explicit {@link flush}. */
	mode: SaveMode;
	/** Returns the patch to send, or `null` when there are no unsaved changes. Reads reactive state. */
	getPatch: () => TPatch | null;
	/** Performs the save request. */
	save: (patch: TPatch) => Promise<TResult>;
	/**
	 * Folds the server response back into the drafts/baselines (advance baselines, reconcile
	 * conflicts, …). Rebaseline accepted fields from the *sent* `patch`, not the echoed `result` —
	 * see the class note on avoiding autosave loops.
	 */
	applyResult?: (patch: TPatch, result: TResult) => void;
	/**
	 * Called when a save fails (e.g. to show a toast): on the first failure of a streak, and on every
	 * failed explicit {@link AutosaveController.flush}. Automatic retries stay quiet.
	 */
	onError?: (error: unknown) => void;
	/** Debounce window for autosave, in ms (default 800). Also the base of the retry backoff. */
	debounceMs?: number;
	/** Longest wait between automatic retries, in ms (default 30000). */
	retryMaxMs?: number;
	/** Whether a failed save should be retried automatically (default {@link isRetryableError}). */
	shouldRetry?: (error: unknown) => boolean;
}

type Trigger = 'user' | 'timer' | 'retry';

export class AutosaveController<TPatch, TResult = unknown> {
	/** Whether edits flush automatically (debounced) or only on an explicit {@link flush}. */
	readonly mode: SaveMode;

	/** True while a save is in flight. */
	saving = $state(false);
	/** Epoch ms of the last successful save (drives a "saved" indicator); `null` until the first. */
	lastSavedAt = $state<number | null>(null);
	/** The error from the latest failed save; cleared by the next successful one. */
	error = $state<unknown>(undefined);

	/** The patch that would be sent right now, or `null` when clean. Recomputes as the draft changes. */
	readonly pendingPatch: TPatch | null = $derived.by(() => this.#getPatch());
	/** Whether there are unsaved changes. */
	readonly dirty: boolean = $derived(this.pendingPatch !== null);

	#failedState = $state(false);
	#failures = 0;
	#getPatch: AutosaveOptions<TPatch, TResult>['getPatch'];
	#save: AutosaveOptions<TPatch, TResult>['save'];
	#applyResult: AutosaveOptions<TPatch, TResult>['applyResult'];
	#onError: AutosaveOptions<TPatch, TResult>['onError'];
	#shouldRetry: (error: unknown) => boolean;
	#debounceMs: number;
	#retryMaxMs: number;
	#timer: ReturnType<typeof setTimeout> | undefined;
	/** Whether the pending timer is a backoff retry (new edits don't shorten it). */
	#retrying = false;
	#inFlight: Promise<void> | null = null;
	/** A timer fired during a save; run again once it settles. */
	#queued = false;
	#destroyed = false;

	constructor(options: AutosaveOptions<TPatch, TResult>) {
		this.mode = options.mode;
		this.#getPatch = options.getPatch;
		this.#save = options.save;
		this.#applyResult = options.applyResult;
		this.#onError = options.onError;
		this.#shouldRetry = options.shouldRetry ?? isRetryableError;
		this.#debounceMs = options.debounceMs ?? 800;
		this.#retryMaxMs = options.retryMaxMs ?? 30_000;
	}

	/** Whether the latest save failed and its changes are still unsaved. */
	get failed(): boolean {
		return this.#failedState && this.dirty;
	}

	/**
	 * Schedules a debounced autosave when there are changes (a no-op in manual mode, when clean, or
	 * after {@link destroy}). While a retry is waiting, new edits ride along with it instead.
	 */
	scheduleFlush(): void {
		if (this.mode !== 'autosave' || this.#destroyed || this.#retrying) return;
		clearTimeout(this.#timer);
		if (!this.pendingPatch) return;
		this.#timer = setTimeout(() => this.#fire('timer'), this.#debounceMs);
	}

	/**
	 * Sends the pending patch now (from a Save button). If a save is already in flight, waits for it
	 * and then sends whatever changed since. Resolves when done; never rejects (see `onError`).
	 */
	async flush(): Promise<void> {
		this.#cancelTimer();
		while (this.#inFlight) await this.#inFlight;
		if (!this.pendingPatch) return;
		this.#start('user');
		await this.#inFlight;
	}

	/**
	 * Stops timers and retries (call on unmount / when replacing the controller). By default, in
	 * autosave mode, pending changes are sent one last time (fire and forget) instead of being
	 * dropped; pass `{ flush: false }` to discard them. Manual mode never flushes here.
	 */
	destroy(options: { flush?: boolean } = {}): void {
		const { flush = this.mode === 'autosave' } = options;
		this.#destroyed = true;
		this.#cancelTimer();
		if (flush) void this.flush();
	}

	#cancelTimer(): void {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		this.#retrying = false;
	}

	#fire(trigger: Trigger): void {
		this.#timer = undefined;
		this.#retrying = false;
		if (this.#inFlight) this.#queued = true;
		else this.#start(trigger);
	}

	#start(trigger: Trigger): void {
		const patch = this.pendingPatch;
		if (!patch) return;
		this.#inFlight = this.#attempt(patch, trigger).then(() => {
			this.#inFlight = null;
			if (!this.#queued) return;
			this.#queued = false;
			if (!this.#destroyed && !this.#retrying) this.#start('timer');
		});
	}

	async #attempt(patch: TPatch, trigger: Trigger): Promise<void> {
		this.saving = true;
		try {
			const result = await this.#save(patch);
			this.#applyResult?.(patch, result);
			this.lastSavedAt = Date.now();
			this.#failures = 0;
			this.#failedState = false;
			this.error = undefined;
		} catch (error) {
			this.#failures++;
			this.#failedState = true;
			this.error = error;
			if (trigger === 'user' || this.#failures === 1) this.#onError?.(error);
			if (this.mode === 'autosave' && !this.#destroyed && this.#shouldRetry(error)) {
				clearTimeout(this.#timer);
				this.#retrying = true;
				this.#timer = setTimeout(
					() => this.#fire('retry'),
					retryDelay(this.#failures, this.#debounceMs, this.#retryMaxMs)
				);
			}
		} finally {
			this.saving = false;
		}
	}
}
