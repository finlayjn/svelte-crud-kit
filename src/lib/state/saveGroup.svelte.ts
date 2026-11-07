import { SvelteSet } from 'svelte/reactivity';

/**
 * Something whose save state a {@link SaveGroup} aggregates: an `AutosaveController`, a
 * `SaveTracker`, another `SaveGroup`, or any object with these reactive getters.
 */
export interface SaveSource {
	readonly dirty: boolean;
	readonly saving: boolean;
	readonly failed?: boolean;
	/** Commits the source's pending edits now. Omit for a source that only reports state. */
	flush?: () => Promise<void>;
}

/**
 * Aggregates several save sources into one state for a page: the main record editor plus each
 * child collection, so one indicator and one unsaved-changes guard cover them all.
 *
 * ```ts
 * const group = new SaveGroup();
 * onMount(() => group.register(editor)); // returns the unregister cleanup
 * useUnsavedGuard(() => group.dirty);
 * const label = $derived(saveIndicatorLabel(mode, group));
 * ```
 *
 * Membership is reactive, so a source registered or removed after the group was first read updates
 * `dirty`, `saving` and `failed`.
 */
export class SaveGroup implements SaveSource {
	#sources = new SvelteSet<SaveSource>();

	/** Whether any source has unsaved changes. */
	get dirty(): boolean {
		for (const source of this.#sources) if (source.dirty) return true;
		return false;
	}

	/** Whether any source is saving. */
	get saving(): boolean {
		for (const source of this.#sources) if (source.saving) return true;
		return false;
	}

	/** Whether any source's latest save failed. */
	get failed(): boolean {
		for (const source of this.#sources) if (source.failed) return true;
		return false;
	}

	/** Adds a source. Returns a function that removes it again (call it on unmount). */
	register(source: SaveSource): () => void {
		this.#sources.add(source);
		return () => {
			this.#sources.delete(source);
		};
	}

	/** Commits every source's pending edits (the manual-mode Save button). */
	async flushAll(): Promise<void> {
		await Promise.all([...this.#sources].map((source) => source.flush?.()));
	}

	/** Same as {@link flushAll}, so a group can be registered in another group. */
	flush(): Promise<void> {
		return this.flushAll();
	}
}
