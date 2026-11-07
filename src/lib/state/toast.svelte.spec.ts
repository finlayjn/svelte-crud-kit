import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastStore } from './toast.svelte.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ToastStore', () => {
	it('dismisses info toasts and keeps errors until dismissed', () => {
		const store = new ToastStore();
		store.success('Saved');
		const error = store.error('Failed');
		vi.advanceTimersByTime(60_000);
		expect(store.toasts.map((t) => t.message)).toEqual(['Failed']);
		store.dismiss(error);
		expect(store.toasts).toEqual([]);
	});

	it('pauses and resumes the countdown', () => {
		const store = new ToastStore();
		store.info('Hello', 1000);
		vi.advanceTimersByTime(600);
		store.pause();
		vi.advanceTimersByTime(10_000);
		expect(store.toasts).toHaveLength(1);
		store.resume();
		vi.advanceTimersByTime(999);
		expect(store.toasts).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(store.toasts).toHaveLength(0);
	});

	it('waits to start a toast shown while paused', () => {
		const store = new ToastStore();
		store.pause();
		store.info('Hello', 2000);
		vi.advanceTimersByTime(5000);
		expect(store.toasts).toHaveLength(1);
		store.resume();
		vi.advanceTimersByTime(2000);
		expect(store.toasts).toHaveLength(0);
	});
});
