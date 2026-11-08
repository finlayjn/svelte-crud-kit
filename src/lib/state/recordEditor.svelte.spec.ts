import { describe, expect, it, vi } from 'vitest';
import { RecordEditor, sameFieldValue, type FieldChange } from './recordEditor.svelte.js';
import type { ChangeResult } from './changeQueue.svelte.js';

type Row = { name: string; notes: string | null; tags: string[] | null };

function setup(respond: (changes: FieldChange<'name' | 'notes' | 'tags'>[]) => ChangeResult[]) {
	const row: Row = { name: 'Main Street', notes: null, tags: null };
	const calls: FieldChange[][] = [];
	const editor = new RecordEditor({
		fields: ['name', 'notes', 'tags'] as const,
		data: () => row,
		save: async (changes) => {
			calls.push(changes);
			return { results: respond(changes) };
		}
	});
	return { editor, calls, row };
}

describe('RecordEditor', () => {
	it('binds fields, holds edits until flush and sends only real changes', async () => {
		const { editor, calls } = setup((c) => c.map(() => ({ status: 'saved' })));
		expect(editor.draft.notes).toBe('');
		editor.draft.notes = '  ';
		editor.draft.tags = [];
		expect(editor.dirty).toBe(false);

		editor.draft.name = 'Main Street East';
		expect(editor.draft.name).toBe('Main Street East');
		await editor.flush();
		expect(calls[0]).toEqual([{ field: 'name', value: 'Main Street East', baseline: 'Main Street' }]);
		expect(editor.dirty).toBe(false);
	});

	it('lists a conflict instead of overwriting', async () => {
		const { editor } = setup(() => [{ status: 'conflict', current: 'Harbor View' }]);
		editor.draft.name = 'Mine';
		await editor.flush();
		expect(editor.queue.problems.get('name')).toMatchObject({ theirs: 'Harbor View' });
		expect(editor.draft.name).toBe('Mine');
	});

	it('treats blank, null and empty lists as the same value', () => {
		expect(sameFieldValue('', null)).toBe(true);
		expect(sameFieldValue(' a ', 'a')).toBe(true);
		expect(sameFieldValue([], undefined)).toBe(true);
		expect(sameFieldValue(['x'], ['x'])).toBe(true);
		expect(sameFieldValue('a', 'b')).toBe(false);
		vi.restoreAllMocks();
	});
});
