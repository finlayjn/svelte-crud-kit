import { getContext, setContext } from 'svelte';

/**
 * A tiny app-wide toast store. Pages and components push transient notices (save confirmations,
 * sync warnings, conflict alerts, errors) and a single `Toaster` renders them. Kept in context
 * (created once in the root layout) so there's exactly one toast stack for the whole app.
 */

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
	id: number;
	kind: ToastKind;
	message: string;
}

const KEY = Symbol('svelte-crud-kit-toasts');

/**
 * How long, in ms, a toast stays before dismissing itself. Errors stay until dismissed (0), so
 * nobody misses one while looking away.
 */
const DEFAULT_TTL: Record<ToastKind, number> = {
	info: 4000,
	success: 4000,
	warning: 8000,
	error: 0
};

interface Timer {
	handle: ReturnType<typeof setTimeout> | undefined;
	remaining: number;
	startedAt: number;
}

export class ToastStore {
	toasts = $state<Toast[]>([]);
	#nextId = 0;
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive: timer bookkeeping
	#timers = new Map<number, Timer>();
	#paused = false;

	/**
	 * Shows a toast and schedules its dismissal after `ttl` ms (0 keeps it until dismissed).
	 * Returns the id (so it can be dismissed early).
	 */
	show(message: string, kind: ToastKind = 'info', ttl = DEFAULT_TTL[kind]): number {
		const id = this.#nextId++;
		this.toasts.push({ id, kind, message });
		if (ttl > 0) {
			const timer: Timer = { handle: undefined, remaining: ttl, startedAt: Date.now() };
			this.#timers.set(id, timer);
			if (!this.#paused) this.#start(id, timer);
		}
		return id;
	}

	success(message: string, ttl?: number) {
		return this.show(message, 'success', ttl);
	}

	/** Shows an error; it stays until dismissed unless you pass a `ttl`. */
	error(message: string, ttl?: number) {
		return this.show(message, 'error', ttl);
	}

	warning(message: string, ttl?: number) {
		return this.show(message, 'warning', ttl);
	}

	info(message: string, ttl?: number) {
		return this.show(message, 'info', ttl);
	}

	dismiss(id: number) {
		clearTimeout(this.#timers.get(id)?.handle);
		this.#timers.delete(id);
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	/** Stops the dismissal countdowns (the `Toaster` calls this while hovered or focused). */
	pause() {
		if (this.#paused) return;
		this.#paused = true;
		for (const timer of this.#timers.values()) {
			clearTimeout(timer.handle);
			timer.handle = undefined;
			timer.remaining -= Date.now() - timer.startedAt;
		}
	}

	/** Restarts the countdowns, leaving each toast at least a second. */
	resume() {
		if (!this.#paused) return;
		this.#paused = false;
		for (const [id, timer] of this.#timers) {
			timer.remaining = Math.max(timer.remaining, 1000);
			this.#start(id, timer);
		}
	}

	#start(id: number, timer: Timer) {
		timer.startedAt = Date.now();
		timer.handle = setTimeout(() => this.dismiss(id), timer.remaining);
	}
}

/** Creates the toast store and puts it in context. Call once, in the root layout. */
export function createToasts(): ToastStore {
	return setContext(KEY, new ToastStore());
}

/** Reads the toast store. Call from any page/component under the root layout. */
export function getToasts(): ToastStore {
	return getContext<ToastStore>(KEY);
}
