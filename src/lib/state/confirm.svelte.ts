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

export interface ConfirmOptions {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	/** `error` styles the confirm button as destructive (the default for deletes). */
	kind?: 'primary' | 'error';
	/**
	 * An optional extra checkbox shown in the dialog (e.g. "also delete related records"). Read its
	 * ticked state from {@link ConfirmStore.checkboxChecked} right after `ask` resolves.
	 */
	checkbox?: { label: string; defaultChecked?: boolean };
}

interface PendingConfirm extends ConfirmOptions {
	resolve: (ok: boolean) => void;
}

const KEY = Symbol('svelte-crud-kit-confirm');

export class ConfirmStore {
	pending = $state<PendingConfirm | null>(null);
	/** Live ticked state of the optional checkbox; holds its last value after `ask` resolves. */
	checkboxChecked = $state(false);

	/** Opens the dialog and resolves to whether the user confirmed. */
	ask(options: ConfirmOptions): Promise<boolean> {
		// If a prompt is already open, resolve it as cancelled before replacing it.
		this.pending?.resolve(false);
		this.checkboxChecked = options.checkbox?.defaultChecked ?? false;
		return new Promise<boolean>((resolve) => {
			this.pending = { ...options, resolve };
		});
	}

	#settle(ok: boolean) {
		this.pending?.resolve(ok);
		this.pending = null;
	}

	confirm() {
		this.#settle(true);
	}

	cancel() {
		this.#settle(false);
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
