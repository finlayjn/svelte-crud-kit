import type { SaveMode } from './editDraft.svelte.js';

/**
 * A framework-agnostic save *engine* for editable detail pages: debounced autosave, single-flight
 * de-duplication, retry-on-error, and the `dirty` / `saving` / `lastSavedAt` indicators — without
 * knowing anything about your record shape.
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
	/** Called when a save throws (e.g. to show a toast). In autosave mode the flush is retried. */
	onError?: (error: unknown) => void;
	/** Debounce window for autosave, in ms (default 800). */
	debounceMs?: number;
}

export class AutosaveController<TPatch, TResult = unknown> {
	/** Whether edits flush automatically (debounced) or only on an explicit {@link flush}. */
	readonly mode: SaveMode;

	/** True while a save is in flight. */
	saving = $state(false);
	/** Epoch ms of the last successful save (drives a "saved" indicator); `null` until the first. */
	lastSavedAt = $state<number | null>(null);

	/** The patch that would be sent right now, or `null` when clean. Recomputes as the draft changes. */
	readonly pendingPatch: TPatch | null = $derived.by(() => this.#getPatch());
	/** Whether there are unsaved changes. */
	readonly dirty: boolean = $derived(this.pendingPatch !== null);

	#getPatch: AutosaveOptions<TPatch, TResult>['getPatch'];
	#save: AutosaveOptions<TPatch, TResult>['save'];
	#applyResult: AutosaveOptions<TPatch, TResult>['applyResult'];
	#onError: AutosaveOptions<TPatch, TResult>['onError'];
	#debounceMs: number;
	#timer: ReturnType<typeof setTimeout> | undefined;

	constructor(options: AutosaveOptions<TPatch, TResult>) {
		this.mode = options.mode;
		this.#getPatch = options.getPatch;
		this.#save = options.save;
		this.#applyResult = options.applyResult;
		this.#onError = options.onError;
		this.#debounceMs = options.debounceMs ?? 800;
	}

	/** Schedules a debounced autosave when there are changes (a no-op in manual mode / when clean). */
	scheduleFlush(): void {
		if (this.mode !== 'autosave') return;
		clearTimeout(this.#timer);
		if (!this.pendingPatch) return;
		this.#timer = setTimeout(() => void this.flush(), this.#debounceMs);
	}

	/** Sends the pending patch now (from a Save button, or the autosave timer). */
	async flush(): Promise<void> {
		clearTimeout(this.#timer);
		const patch = this.pendingPatch;
		if (!patch) return;
		// Don't overlap saves; in autosave mode, retry once the current one finishes.
		if (this.saving) {
			if (this.mode === 'autosave') this.scheduleFlush();
			return;
		}

		this.saving = true;
		try {
			const result = await this.#save(patch);
			this.#applyResult?.(patch, result);
			this.lastSavedAt = Date.now();
		} catch (error) {
			this.#onError?.(error);
			// Re-arm autosave so the change isn't lost.
			if (this.mode === 'autosave') this.scheduleFlush();
		} finally {
			this.saving = false;
		}
	}
}
