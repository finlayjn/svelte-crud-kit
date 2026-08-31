import type { SaveMode } from './editDraft.svelte.js';

/** The two flags a save engine exposes, as read for the indicator. */
export interface SaveIndicatorState {
	/** True while a save is in flight. */
	saving: boolean;
	/** True when there are unsaved changes. */
	dirty: boolean;
}

/**
 * Maps a save engine's state to the standard indicator label, so pages don't re-implement the same
 * ternary. Pairs with {@link import('./autosave.svelte.js').AutosaveController} /
 * {@link import('./saveTracker.svelte.js').SaveTracker} (whose `saving`/`dirty` you pass here) and
 * mirrors the wording used across the kit:
 *
 *  - saving → `Saving…`
 *  - dirty, manual → `Unsaved changes` (waiting for the Save button)
 *  - dirty, autosave → `Waiting to save` (a debounced flush is pending)
 *  - clean → `All changes saved`
 */
export function saveIndicatorLabel(mode: SaveMode, state: SaveIndicatorState): string {
	if (state.saving) return 'Saving…';
	if (state.dirty) return mode === 'manual' ? 'Unsaved changes' : 'Waiting to save';
	return 'All changes saved';
}
