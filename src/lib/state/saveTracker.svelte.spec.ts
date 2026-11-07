import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveTracker } from './saveTracker.svelte.js';

/** A save function whose calls are resolved or rejected by the test. */
function deferred() {
	const calls: { value: string; resolve: () => void; reject: (e: unknown) => void }[] = [];
	const saver = (value: string) => () =>
		new Promise<void>((resolve, reject) => calls.push({ value, resolve, reject }));
	return { calls, saver };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('SaveTracker', () => {
	it('debounces per key and aggregates state', async () => {
		const tracker = new SaveTracker({ mode: 'autosave', debounceMs: 100 });
		const save = vi.fn(async () => {});
		tracker.schedule('a', save);
		tracker.schedule('b', save);
		expect(tracker.state).toBe('pending');
		expect(tracker.dirty).toBe(true);
		await vi.advanceTimersByTimeAsync(100);
		expect(save).toHaveBeenCalledTimes(2);
		expect(tracker.state).toBe('saved');
	});

	it('serializes saves for one key and drains newer edits', async () => {
		const { calls, saver } = deferred();
		const tracker = new SaveTracker({ mode: 'autosave', debounceMs: 100 });
		tracker.schedule('a', saver('1'));
		await vi.advanceTimersByTimeAsync(100);
		tracker.schedule('a', saver('2'));
		await vi.advanceTimersByTimeAsync(100);
		expect(calls).toHaveLength(1);
		expect(tracker.state).toBe('saving');
		calls[0].resolve();
		await vi.advanceTimersByTimeAsync(0);
		expect(calls).toHaveLength(2);
		expect(calls[1].value).toBe('2');
		calls[1].resolve();
		await vi.advanceTimersByTimeAsync(0);
		expect(tracker.state).toBe('saved');
	});

	it('retries with backoff and reports a failure streak once', async () => {
		const onError = vi.fn();
		const tracker = new SaveTracker({ mode: 'autosave', debounceMs: 100, onError });
		const save = vi.fn(async () => {
			throw new Error('offline');
		});
		tracker.schedule('a', save);
		await vi.advanceTimersByTimeAsync(100);
		expect(tracker.failed).toBe(true);
		expect(tracker.isFailed('a')).toBe(true);
		expect(tracker.state).toBe('failed');
		expect(tracker.error).toBeInstanceOf(Error);

		await vi.advanceTimersByTimeAsync(199);
		expect(save).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(save).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(400);
		expect(save).toHaveBeenCalledTimes(3);
		expect(onError).toHaveBeenCalledTimes(1);
		expect(onError).toHaveBeenCalledWith(expect.any(Error), 'a');

		// A newer edit rides along with the pending retry instead of cutting it short.
		const fixed = vi.fn(async () => {});
		tracker.schedule('a', fixed);
		await vi.advanceTimersByTimeAsync(100);
		expect(fixed).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(700);
		expect(fixed).toHaveBeenCalledTimes(1);
		expect(tracker.state).toBe('saved');
		expect(tracker.error).toBeUndefined();
	});

	it('does not retry a 4xx error', async () => {
		const onError = vi.fn();
		const tracker = new SaveTracker({ mode: 'autosave', debounceMs: 100, onError });
		const save = vi.fn(async () => {
			throw { status: 422 };
		});
		tracker.schedule('a', save);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(save).toHaveBeenCalledTimes(1);
		expect(tracker.isPending('a')).toBe(true);
		await tracker.commit('a');
		expect(save).toHaveBeenCalledTimes(2);
		expect(onError).toHaveBeenCalledTimes(2);
	});

	it('retries 408 and 429', async () => {
		const tracker = new SaveTracker({ mode: 'autosave', debounceMs: 100 });
		const save = vi.fn(async () => {
			throw { status: 429 };
		});
		tracker.schedule('a', save);
		await vi.advanceTimersByTimeAsync(300);
		expect(save).toHaveBeenCalledTimes(2);
		tracker.destroy({ flush: false });
	});

	it('commit and flush wait for an in-flight save', async () => {
		const { calls, saver } = deferred();
		const tracker = new SaveTracker({ mode: 'manual' });
		tracker.schedule('a', saver('1'));
		const first = tracker.flush();
		tracker.schedule('a', saver('2'));
		let done = false;
		const second = tracker.flush().then(() => (done = true));
		calls[0].resolve();
		await vi.advanceTimersByTimeAsync(0);
		// The running drain sends the newer edit itself; both flushes wait for it.
		expect(calls).toHaveLength(2);
		expect(calls[1].value).toBe('2');
		expect(done).toBe(false);
		calls[1].resolve();
		await Promise.all([first, second]);
		expect(done).toBe(true);
		expect(tracker.dirty).toBe(false);
	});

	it('destroy commits pending autosave edits by default', async () => {
		const tracker = new SaveTracker({ mode: 'autosave', debounceMs: 100 });
		const save = vi.fn(async () => {});
		tracker.schedule('a', save);
		tracker.destroy();
		await vi.advanceTimersByTimeAsync(0);
		expect(save).toHaveBeenCalledTimes(1);
	});

	it('destroy can discard instead, and never commits in manual mode', async () => {
		const save = vi.fn(async () => {});
		const auto = new SaveTracker({ mode: 'autosave', debounceMs: 100 });
		auto.schedule('a', save);
		auto.destroy({ flush: false });
		const manual = new SaveTracker({ mode: 'manual' });
		manual.schedule('a', save);
		manual.destroy();
		await vi.advanceTimersByTimeAsync(1000);
		expect(save).not.toHaveBeenCalled();
	});
});
