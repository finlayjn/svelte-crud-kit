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

/** How long, in ms, a toast stays before auto-dismissing (errors linger longer). */
const DEFAULT_TTL: Record<ToastKind, number> = {
	info: 3000,
	success: 3000,
	warning: 5000,
	error: 8000
};

export class ToastStore {
	toasts = $state<Toast[]>([]);
	#nextId = 0;

	/** Shows a toast and schedules its dismissal. Returns the id (so it can be dismissed early). */
	show(message: string, kind: ToastKind = 'info', ttl = DEFAULT_TTL[kind]): number {
		const id = this.#nextId++;
		this.toasts.push({ id, kind, message });
		if (ttl > 0) setTimeout(() => this.dismiss(id), ttl);
		return id;
	}

	success(message: string, ttl?: number) {
		return this.show(message, 'success', ttl);
	}

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
		this.toasts = this.toasts.filter((t) => t.id !== id);
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
