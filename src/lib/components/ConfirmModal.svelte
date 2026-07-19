<script lang="ts">
	import { getConfirm } from '../state/confirm.svelte.js';

	/**
	 * Renders the app's confirmation dialog (daisyUI `modal`). Place once, in the root layout; it
	 * shows whatever `ConfirmStore.ask` requests and resolves the caller's promise on choice.
	 *
	 * Requires `createConfirm()` to have been called (in the same layout).
	 */
	const confirm = getConfirm();

	/**
	 * Keeps the native `<dialog>` open/closed in step with the pending request. As an attachment it
	 * re-runs whenever `confirm.pending` changes, so no `bind:this` + `$effect` pair is needed.
	 */
	function sync(node: HTMLDialogElement) {
		if (confirm.pending) node.showModal();
		else node.close();
	}
</script>

<dialog {@attach sync} class="modal" onclose={() => confirm.cancel()}>
	{#if confirm.pending}
		<div class="modal-box">
			<h3 class="text-lg font-bold">{confirm.pending.title}</h3>
			{#if confirm.pending.message}
				<p class="text-base-content/80 py-4">{confirm.pending.message}</p>
			{/if}
			{#if confirm.pending.checkbox}
				<label class="mt-2 flex items-center gap-2">
					<input
						type="checkbox"
						class="checkbox checkbox-sm"
						bind:checked={confirm.checkboxChecked}
					/>
					<span class="text-sm">{confirm.pending.checkbox.label}</span>
				</label>
			{/if}
			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={() => confirm.cancel()}>
					{confirm.pending.cancelLabel ?? 'Cancel'}
				</button>
				<button
					type="button"
					class="btn {confirm.pending.kind === 'error' ? 'btn-error' : 'btn-primary'}"
					onclick={() => confirm.confirm()}
				>
					{confirm.pending.confirmLabel ?? 'Confirm'}
				</button>
			</div>
		</div>
	{/if}
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
