/**
 * Save behavior for editable detail pages.
 *
 * - `autosave`: changed fields are flushed automatically (debounced) as you edit.
 * - `manual`: changes are held until you press Save, then sent as one batch.
 *
 * Both modes typically share the same backend patch; only *when* the flush happens differs.
 */
export type SaveMode = 'autosave' | 'manual';
