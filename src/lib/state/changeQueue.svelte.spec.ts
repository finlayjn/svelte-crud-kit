import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangeQueue, type ChangeResult } from './changeQueue.svelte.js';
import type { SaveMode } from './types.js';

type Change =
	| { kind: 'set'; field: string; value: string; baseline: string }
	| { kind: 'remove'; id: number; check: string };

const key = (c: Change) => (c.kind === 'set' ? `set:${c.field}` : `remove:${c.id}`);

/** A save function whose responses the test controls. */
function fakeSave() {
	const calls: Change[][] = [];
	let respond: (changes: Change[]) => ChangeResult[] = (changes) =>
		changes.map(() => ({ status: 'saved' }));
	let gate: Promise<void> | null = null;
	const save = vi.fn(async (changes: Change[]) => {
		calls.push(changes);
		if (gate) await gate;
		return { results: respond(changes) };
	});
	return {
		save,
		calls,
		respondWith(fn: typeof respond) {
			respond = fn;
		},
		/** Holds the next responses until the returned function is called. */
		hold() {
			let release!: () => void;
			gate = new Promise((resolve) => (release = resolve));
			return () => {
				gate = null;
				release();
			};
		}
	};
}

function setup(mode: SaveMode, extra: { merge?: boolean; rebase?: boolean } = {}) {
	const server = fakeSave();
	const onError = vi.fn();
	const queue = new ChangeQueue<Change>({
		mode,
		key,
		save: server.save,
		onError,
		merge: extra.merge
			? (sent, mine, theirs) =>
					sent.kind === 'set' && mine.kind === 'set'
						? { ...mine, value: `${theirs}+${mine.value}`, baseline: String(theirs) }
						: null
			: undefined,
		rebase: extra.rebase
			? (change) => (change.kind === 'remove' ? { ...change, check: 'now' } : change)
			: undefined
	});
	const set = (field: string, value: string, baseline = '', immediate = false) =>
		queue.setValue({ kind: 'set', field, value, baseline }, { immediate });
	return { queue, server, onError, set };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ChangeQueue', () => {
	it('in manual mode, holds every change until flush', async () => {
		const { queue, server, set } = setup('manual');
		set('title', 'Draft');
		queue.put({ kind: 'remove', id: 7, check: '' });
		queue.blur();
		await vi.runAllTimersAsync();
		expect(server.save).not.toHaveBeenCalled();
		expect(queue.dirty).toBe(true);

		await queue.flush();
		expect(server.calls[0]).toHaveLength(2);
		expect(queue.dirty).toBe(false);
	});

	it('in autosave mode, sends clicks at once and typing after a pause', async () => {
		const { server, set } = setup('autosave');
		set('stage', 'done', '', true);
		await vi.advanceTimersByTimeAsync(0);
		expect(server.calls).toHaveLength(1);

		set('title', 'Draft');
		await vi.advanceTimersByTimeAsync(1000);
		expect(server.calls).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(600);
		expect(server.calls).toHaveLength(2);
	});

	it('keeps the first baseline and drops an edit typed back to it', () => {
		const { queue, set } = setup('manual');
		set('title', 'a', 'old');
		set('title', 'ab', 'a');
		expect(queue.get('set:title')).toMatchObject({ value: 'ab', baseline: 'old' });
		set('title', 'old', 'ab');
		expect(queue.dirty).toBe(false);
	});

	it('keeps an undo typed while that field is being saved', async () => {
		const { queue, server, set } = setup('manual');
		set('title', 'a');
		const release = server.hold();
		const saving = queue.flush();
		set('title', '');
		release();
		await saving;
		expect(queue.get('set:title')).toMatchObject({ value: '', baseline: 'a' });

		await queue.flush();
		expect(server.calls[1]).toEqual([{ kind: 'set', field: 'title', value: '', baseline: 'a' }]);
	});

	it('lists a rejected change without retrying, and clears it when the value changes', async () => {
		const { queue, server, set } = setup('autosave');
		server.respondWith(() => [{ status: 'rejected', message: 'Ends before it starts' }]);
		set('end', '09:00');
		queue.blur();
		await vi.runAllTimersAsync();
		expect(server.calls).toHaveLength(1);
		expect(queue.problems.get('set:end')).toMatchObject({
			kind: 'rejected',
			message: 'Ends before it starts'
		});

		server.respondWith((changes) => changes.map(() => ({ status: 'saved' })));
		set('end', '11:00');
		queue.blur();
		await vi.runAllTimersAsync();
		expect(queue.problems.size).toBe(0);
		expect(queue.dirty).toBe(false);
	});

	it('reports a failing save once and retries with backoff', async () => {
		const { queue, server, onError, set } = setup('autosave');
		server.save
			.mockRejectedValueOnce(new Error('offline'))
			.mockRejectedValueOnce(new Error('offline'));
		set('stage', 'done', '', true);
		await vi.advanceTimersByTimeAsync(0);
		expect(queue.failing).toBe(true);
		expect(queue.failed).toBe(true);
		expect(queue.retrying).toBe(true);
		// Twice the debounce, then doubling.
		await vi.advanceTimersByTimeAsync(2999);
		expect(server.save).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(server.save).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(6000);
		expect(server.save).toHaveBeenCalledTimes(3);
		expect(queue.retrying).toBe(false);
		expect(onError).toHaveBeenCalledTimes(1);
		expect(queue.failing).toBe(false);
		expect(queue.dirty).toBe(false);
	});

	it('does not retry a refused request (4xx)', async () => {
		const { queue, server, set } = setup('autosave');
		server.save.mockRejectedValueOnce({ status: 403, body: { message: 'Not allowed' } });
		set('stage', 'done', '', true);
		await vi.runAllTimersAsync();
		expect(server.save).toHaveBeenCalledTimes(1);
		expect(queue.failing).toBe(true);
		expect(queue.retrying).toBe(false);
	});

	it('reports every failed explicit flush, not just the first', async () => {
		const { queue, server, onError, set } = setup('manual');
		server.save.mockRejectedValue(new Error('offline'));
		set('title', 'Draft');
		await queue.flush();
		await queue.flush();
		expect(onError).toHaveBeenCalledTimes(2);
		expect(queue.failed).toBe(true);
	});

	it('treats a response with too few results as a failure and does not retry it', async () => {
		const { queue, server, onError, set } = setup('autosave');
		server.respondWith(() => []);
		set('a', '1', '', true);
		await vi.runAllTimersAsync();
		expect(server.save).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledTimes(1);
		expect(queue.failed).toBe(true);
		expect(queue.retrying).toBe(false);
	});

	it('lists a conflict and resends against their value when keeping mine', async () => {
		const { queue, server, set } = setup('manual');
		server.respondWith(() => [{ status: 'conflict', current: 'theirs', updatedBy: 'Alex' }]);
		set('stage', 'mine', 'old');
		await queue.flush();
		expect(queue.problems.get('set:stage')).toMatchObject({ theirs: 'theirs', by: 'Alex' });

		server.respondWith((changes) => changes.map(() => ({ status: 'saved' })));
		queue.keepMine('set:stage');
		await vi.runAllTimersAsync();
		expect(server.calls[1]).toEqual([
			{ kind: 'set', field: 'stage', value: 'mine', baseline: 'theirs' }
		]);
		expect(queue.dirty).toBe(false);
	});

	it('drops my change when using theirs, for one or all problems', async () => {
		const { queue, server, set } = setup('manual');
		server.respondWith((changes) => changes.map(() => ({ status: 'conflict', current: 'x' })));
		set('a', '1');
		set('b', '2');
		await queue.flush();
		expect(queue.problems.size).toBe(2);
		queue.useTheirs('set:a');
		expect(queue.problems.size).toBe(1);
		queue.useAllTheirs();
		expect(queue.dirty).toBe(false);
	});

	it('resends a merge at once instead of listing the conflict', async () => {
		const { queue, server, set } = setup('manual', { merge: true });
		server.respondWith(() => [{ status: 'conflict', current: 'theirs' }]);
		set('notes', 'mine', 'old');
		await queue.flush();
		server.respondWith((changes) => changes.map(() => ({ status: 'saved' })));
		await vi.runAllTimersAsync();
		expect(server.calls[1][0]).toMatchObject({ value: 'theirs+mine', baseline: 'theirs' });
		expect(queue.problems.size).toBe(0);
	});

	it('re-bases a non-value change with the rebase option when keeping mine', async () => {
		const { queue, server } = setup('manual', { rebase: true });
		server.respondWith(() => [{ status: 'conflict', current: 'someone wrote notes' }]);
		queue.put({ kind: 'remove', id: 7, check: 'then' });
		await queue.flush();
		expect(queue.problems.get('remove:7')?.kind).toBe('conflict');

		server.respondWith((changes) => changes.map(() => ({ status: 'saved' })));
		queue.keepMine('remove:7');
		await vi.runAllTimersAsync();
		expect(server.calls[1]).toEqual([{ kind: 'remove', id: 7, check: 'now' }]);
	});

	it('reports a change to a removed record as gone', async () => {
		const { queue, server, set } = setup('manual');
		server.respondWith(() => [{ status: 'gone' }]);
		set('notes', 'hi');
		await queue.flush();
		expect(queue.problems.get('set:notes')?.kind).toBe('gone');
		expect(queue.pending.size).toBe(0);
		queue.useTheirs('set:notes');
		expect(queue.dirty).toBe(false);
	});

	it('sends pending changes on destroy in autosave mode only', async () => {
		const auto = setup('autosave');
		auto.set('title', 'Draft');
		auto.queue.destroy();
		await vi.runAllTimersAsync();
		expect(auto.server.save).toHaveBeenCalledTimes(1);

		const manual = setup('manual');
		manual.set('title', 'Draft');
		manual.queue.destroy();
		await vi.runAllTimersAsync();
		expect(manual.server.save).not.toHaveBeenCalled();
	});
});
