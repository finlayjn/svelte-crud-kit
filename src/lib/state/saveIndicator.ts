import type { SaveMode } from './types.js';

/** The flags a save engine exposes, as read for the indicator. */
export interface SaveIndicatorState {
	/** True while a save is in flight. */
	saving: boolean;
	/** True when there are unsaved changes. */
	dirty: boolean;
	/** True when the latest save failed and its changes are still unsaved. */
	failed?: boolean;
}

/**
 * Maps a save engine's state to the standard indicator label, so pages don't re-implement the same
 * ternary. Pairs with {@link import('./autosave.svelte.js').AutosaveController},
 * {@link import('./saveTracker.svelte.js').SaveTracker} and
 * {@link import('./saveGroup.svelte.js').SaveGroup} (pass the engine itself, or its flags) and
 * mirrors the wording used across the kit:
 *
 *  - saving → `Saving…`
 *  - failed → `Couldn't save`
 *  - dirty, manual → `Unsaved changes` (waiting for the Save button)
 *  - dirty, autosave → `Waiting to save` (a debounced flush is pending)
 *  - clean → `All changes saved`
 */
export function saveIndicatorLabel(mode: SaveMode, state: SaveIndicatorState): string {
	if (state.saving) return 'Saving…';
	if (state.failed) return "Couldn't save";
	if (state.dirty) return mode === 'manual' ? 'Unsaved changes' : 'Waiting to save';
	return 'All changes saved';
}
