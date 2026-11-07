import { getContext, setContext } from 'svelte';

/**
 * App-wide confirmation dialog, exposed as a promise. Anywhere under the root layout can call
 * `await confirm.ask({ title, message })` and get back `true`/`false`, replacing native
 * `window.confirm`. A single `ConfirmModal` (mounted in the root layout) renders the request.
 *
 * Usage:
 * ```ts
 * // root layout <script>
 * import { createConfirm } from '@finlayjn/svelte-crud-kit/state';
 * createConfirm();
 * ```
 * ```svelte
 * <!-- root layout markup -->
 * <ConfirmModal />
 * ```
 * ```ts
 * // anywhere below
 * const confirm = getConfirm();
 * if (await confirm.ask({ title: 'Delete?', kind: 'error' })) …
 * ```
 */

/** The confirm button's color: `error` for destructive actions (the default for deletes). */
export type ConfirmKind = 'primary' | 'error' | 'warning' | 'neutral';

export interface ConfirmOptions {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** The confirm button's color (default `primary`). */
	kind?: ConfirmKind;
	/**
	 * An optional extra checkbox shown in the dialog (e.g. "also delete related records"). Read its
	 * ticked state from {@link ConfirmStore.checkboxChecked} right after `ask` resolves.
	 */
	checkbox?: { label: string; defaultChecked?: boolean };
}

/** A request made through {@link ConfirmStore.ask}. */
export interface ConfirmRequest extends ConfirmOptions {
	/** Identifies the request, so a late close of an earlier one can't settle it. */
	id: number;
}

const KEY = Symbol('svelte-crud-kit-confirm');

export class ConfirmStore {
	/** The open request, or `null` when the dialog is closed (or closing). */
	pending = $state<ConfirmRequest | null>(null);
	/**
	 * The most recent request, kept after it settles so the dialog can keep showing it while its
	 * close animation runs.
	 */
	last = $state<ConfirmRequest | null>(null);
	/** Live ticked state of the optional checkbox; holds its last value after `ask` resolves. */
	checkboxChecked = $state(false);

	#nextId = 1;
	#resolve: ((ok: boolean) => void) | null = null;

	/** Opens the dialog and resolves to whether the user confirmed. */
	ask(options: ConfirmOptions): Promise<boolean> {
		// If a prompt is already open, resolve it as canceled before replacing it.
		this.#settle(false);
		this.checkboxChecked = options.checkbox?.defaultChecked ?? false;
		const request: ConfirmRequest = { ...options, id: this.#nextId++ };
		return new Promise<boolean>((resolve) => {
			this.#resolve = resolve;
			this.pending = request;
			this.last = request;
		});
	}

	/** Confirms the open request (or only request `id`, when given). */
	confirm(id?: number) {
		if (id === undefined || id === this.pending?.id) this.#settle(true);
	}

	/** Cancels the open request (or only request `id`, when given). */
	cancel(id?: number) {
		if (id === undefined || id === this.pending?.id) this.#settle(false);
	}

	#settle(ok: boolean) {
		const resolve = this.#resolve;
		this.#resolve = null;
		this.pending = null;
		resolve?.(ok);
	}
}

/** Creates the confirm store and puts it in context. Call once, in the root layout. */
export function createConfirm(): ConfirmStore {
	return setContext(KEY, new ConfirmStore());
}

/** Reads the confirm store. Call from any page/component under the root layout. */
export function getConfirm(): ConfirmStore {
	return getContext<ConfirmStore>(KEY);
}
