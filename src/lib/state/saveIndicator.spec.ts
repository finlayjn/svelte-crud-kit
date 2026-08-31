import { describe, expect, it } from 'vitest';
import { saveIndicatorLabel } from './saveIndicator.js';

describe('saveIndicatorLabel', () => {
	it('prefers "Saving…" over dirtiness, in either mode', () => {
		expect(saveIndicatorLabel('manual', { saving: true, dirty: true })).toBe('Saving…');
		expect(saveIndicatorLabel('autosave', { saving: true, dirty: false })).toBe('Saving…');
	});

	it('distinguishes a dirty draft by mode', () => {
		expect(saveIndicatorLabel('manual', { saving: false, dirty: true })).toBe('Unsaved changes');
		expect(saveIndicatorLabel('autosave', { saving: false, dirty: true })).toBe('Waiting to save');
	});

	it('reports "All changes saved" when clean', () => {
		expect(saveIndicatorLabel('manual', { saving: false, dirty: false })).toBe('All changes saved');
		expect(saveIndicatorLabel('autosave', { saving: false, dirty: false })).toBe(
			'All changes saved'
		);
	});
});
