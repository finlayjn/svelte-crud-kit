import { describe, expect, it } from 'vitest';
import { ConfirmStore } from './confirm.svelte.js';

describe('ConfirmStore', () => {
	it('resolves with the choice and keeps the last request for the closing dialog', async () => {
		const store = new ConfirmStore();
		const answer = store.ask({ title: 'Delete?', kind: 'error' });
		const id = store.pending!.id;
		store.confirm(id);
		await expect(answer).resolves.toBe(true);
		expect(store.pending).toBeNull();
		expect(store.last?.title).toBe('Delete?');
	});

	it('ignores a stale cancel for an earlier request', async () => {
		const store = new ConfirmStore();
		const first = store.ask({ title: 'One' });
		const firstId = store.pending!.id;
		store.confirm(firstId);
		const second = store.ask({ title: 'Two' });
		store.cancel(firstId);
		expect(store.pending?.title).toBe('Two');
		store.confirm(store.pending!.id);
		await expect(first).resolves.toBe(true);
		await expect(second).resolves.toBe(true);
	});

	it('cancels an open request when a new one is asked', async () => {
		const store = new ConfirmStore();
		const first = store.ask({ title: 'One', checkbox: { label: 'Also', defaultChecked: true } });
		expect(store.checkboxChecked).toBe(true);
		void store.ask({ title: 'Two' });
		await expect(first).resolves.toBe(false);
		expect(store.checkboxChecked).toBe(false);
	});
});
