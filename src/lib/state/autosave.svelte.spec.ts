import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AutosaveController } from './autosave.svelte.js';
import type { SaveMode } from './types.js';

/** A tiny draft/baseline pair: the patch is the draft value whenever it differs from the baseline. */
function setup(mode: SaveMode, save: (patch: string) => Promise<unknown>, onError = vi.fn()) {
	const state = $state({ draft: 'a', baseline: 'a' });
	const controller = new AutosaveController<string>({
		mode,
		getPatch: () => (state.draft === state.baseline ? null : state.draft),
		save,
		applyResult: (patch) => (state.baseline = patch),
		onError,
		debounceMs: 100
	});
	const edit = (value: string) => {
		state.draft = value;
		controller.scheduleFlush();
	};
	return { state, controller, edit, onError };
}

/** A save function whose calls are resolved or rejected by the test. */
function deferredSave() {
	const calls: { patch: string; resolve: () => void; reject: (e: unknown) => void }[] = [];
	const save = vi.fn(
		(patch: string) =>
			new Promise<void>((resolve, reject) => calls.push({ patch, resolve, reject }))
	);
	return { save, calls };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('AutosaveController', () => {
	it('debounces edits into one save', async () => {
		const save = vi.fn(async () => {});
		const { controller, edit } = setup('autosave', save);
		edit('b');
		edit('c');
		expect(controller.dirty).toBe(true);
		await vi.advanceTimersByTimeAsync(100);
		expect(save).toHaveBeenCalledTimes(1);
		expect(save).toHaveBeenCalledWith('c');
		expect(controller.dirty).toBe(false);
		expect(controller.lastSavedAt).not.toBeNull();
	});

	it('retries with backoff and reports a failure streak once', async () => {
		const save = vi.fn(async (): Promise<void> => {
			throw new Error('offline');
		});
		const { controller, edit, onError } = setup('autosave', save);
		edit('b');
		await vi.advanceTimersByTimeAsync(100);
		expect(save).toHaveBeenCalledTimes(1);
		expect(controller.failed).toBe(true);
		expect(controller.error).toBeInstanceOf(Error);

		// Retries at 200ms, then 400ms, then 800ms after each failure.
		await vi.advanceTimersByTimeAsync(199);
		expect(save).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(400);
		expect(save).toHaveBeenCalledTimes(3);
		expect(onError).toHaveBeenCalledTimes(1);

		// A new edit doesn't cut the backoff short.
		edit('c');
		await vi.advanceTimersByTimeAsync(100);
		expect(save).toHaveBeenCalledTimes(3);

		save.mockImplementation(async () => {});
		await vi.advanceTimersByTimeAsync(800);
		expect(save).toHaveBeenCalledTimes(4);
		expect(save).toHaveBeenLastCalledWith('c');
		expect(controller.failed).toBe(false);
		expect(controller.error).toBeUndefined();
	});

	it('caps the backoff', async () => {
		const save = vi.fn(async () => {
			throw new Error('offline');
		});
		const state = $state({ draft: 'b' });
		const controller = new AutosaveController<string>({
			mode: 'autosave',
			getPatch: () => state.draft,
			save,
			debounceMs: 100,
			retryMaxMs: 300
		});
		controller.scheduleFlush();
		await vi.advanceTimersByTimeAsync(100 + 200 + 300 + 300);
		expect(save).toHaveBeenCalledTimes(4);
		controller.destroy({ flush: false });
	});

	it('does not retry a 4xx error', async () => {
		const save = vi.fn(async () => {
			throw { status: 400, body: { message: 'Invalid' } };
		});
		const { controller, edit, onError } = setup('autosave', save);
		edit('b');
		await vi.advanceTimersByTimeAsync(10_000);
		expect(save).toHaveBeenCalledTimes(1);
		expect(controller.failed).toBe(true);
		expect(onError).toHaveBeenCalledTimes(1);

		// An explicit flush tries again and reports again.
		await controller.flush();
		expect(save).toHaveBeenCalledTimes(2);
		expect(onError).toHaveBeenCalledTimes(2);
	});

	it('flush waits for an in-flight save, then sends newer changes', async () => {
		const { save, calls } = deferredSave();
		const { controller, edit } = setup('manual', save);
		edit('b');
		const first = controller.flush();
		expect(controller.saving).toBe(true);
		edit('c');
		let done = false;
		const second = controller.flush().then(() => (done = true));
		calls[0].resolve();
		await first;
		await vi.advanceTimersByTimeAsync(0);
		expect(done).toBe(false);
		expect(calls).toHaveLength(2);
		expect(calls[1].patch).toBe('c');
		calls[1].resolve();
		await second;
		expect(controller.dirty).toBe(false);
	});

	it('runs a debounce that fired mid-save once the save settles', async () => {
		const { save, calls } = deferredSave();
		const { controller, edit } = setup('autosave', save);
		edit('b');
		await vi.advanceTimersByTimeAsync(100);
		edit('c');
		await vi.advanceTimersByTimeAsync(100);
		expect(calls).toHaveLength(1);
		calls[0].resolve();
		await vi.advanceTimersByTimeAsync(0);
		expect(calls).toHaveLength(2);
		expect(calls[1].patch).toBe('c');
		calls[1].resolve();
		await vi.advanceTimersByTimeAsync(0);
		expect(controller.dirty).toBe(false);
	});

	it('destroy flushes pending autosave edits by default', async () => {
		const save = vi.fn(async () => {});
		const { controller, edit } = setup('autosave', save);
		edit('b');
		controller.destroy();
		await vi.advanceTimersByTimeAsync(0);
		expect(save).toHaveBeenCalledWith('b');
		edit('c');
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('destroy can discard instead, and never flushes in manual mode', async () => {
		const save = vi.fn(async () => {});
		const a = setup('autosave', save);
		a.edit('b');
		a.controller.destroy({ flush: false });
		const m = setup('manual', save);
		m.edit('b');
		m.controller.destroy();
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).not.toHaveBeenCalled();
	});

	it('manual mode holds edits until flush', async () => {
		const save = vi.fn(async () => {});
		const { controller, edit } = setup('manual', save);
		edit('b');
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).not.toHaveBeenCalled();
		await controller.flush();
		expect(save).toHaveBeenCalledWith('b');
	});
});
