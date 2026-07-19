/**
 * Save behaviour for editable detail pages.
 *
 * - `autosave`: changed fields are flushed automatically (debounced) as you edit.
 * - `manual`: changes are held until you press Save, then sent as one batch.
 *
 * Both modes typically share the same backend patch; only *when* the flush happens differs. The
 * {@link AutosaveController} implements the timing for both.
 */
export type SaveMode = 'autosave' | 'manual';

/**
 * A tiny editable-draft holder for manual-save forms.
 *
 * It keeps a mutable copy of a loaded record plus a `dirty` flag. Recreate it when you navigate to a
 * *different* record, but not when the same record merely reloads (a save or a sibling edit that
 * refreshes the source query in place) — otherwise an in-flight edit is discarded.
 *
 * Reading the id inside a `$derived.by` is not enough on its own: the source row is usually a fresh
 * object on each refresh, so the derived re-runs and rebuilds the draft even though the id is
 * unchanged. Memoise on the id *value* with an explicit cache so the same record returns the same
 * instance:
 *
 * ```ts
 * let cache: { id: number; draft: EditDraft<Row> } | undefined;
 * const editor = $derived.by(() => {
 * 	const id = row.id;
 * 	if (cache?.id === id) return cache.draft;
 * 	cache = { id, draft: untrack(() => new EditDraft(row)) };
 * 	return cache.draft;
 * });
 * ```
 *
 * There's no field-scoped diffing or conflict handling here — this is for low-concurrency admin
 * entities saved as a whole record with an explicit Save button. For field-scoped, debounced saves
 * use {@link AutosaveController} with your own patch builder.
 */
export class EditDraft<T extends Record<string, unknown>> {
	/** The editable copy the form binds to. */
	draft = $state({} as T);
	/** Whether there are unsaved changes (set via {@link markDirty}, cleared by {@link reset}). */
	dirty = $state(false);
	/** True while a save is in flight (for the consumer to disable the Save button, etc.). */
	saving = $state(false);

	constructor(initial: T) {
		this.draft = { ...initial };
	}

	/** Marks the draft as having unsaved changes (call from a field's `onchange`). */
	markDirty() {
		this.dirty = true;
	}

	/** Resets the draft to a freshly loaded record and clears the dirty flag (call after a save). */
	reset(values: T) {
		this.draft = { ...values };
		this.dirty = false;
	}
}
