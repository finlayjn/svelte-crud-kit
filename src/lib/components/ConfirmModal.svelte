<script lang="ts">
	import { getConfirm, type ConfirmKind } from '../state/confirm.svelte.js';
	import Modal from './Modal.svelte';

	/**
	 * Renders the app's confirmation dialog (a {@link Modal}). Place once, in the root layout; it
	 * shows whatever `ConfirmStore.ask` requests and resolves the caller's promise on choice. The
	 * last request stays on screen until the close animation ends, and focus returns to the control
	 * that asked.
	 *
	 * Requires `createConfirm()` to have been called (in the same layout).
	 */
	const confirm = getConfirm();

	const kindClass: Record<ConfirmKind, string> = {
		primary: 'btn-primary',
		error: 'btn-error',
		warning: 'btn-warning',
		neutral: 'btn-neutral'
	};
</script>

<Modal
	bind:open={
		() => confirm.pending !== null,
		(open) => {
			const id = confirm.pending?.id;
			if (!open && id !== undefined) confirm.cancel(id);
		}
	}
	title={confirm.last?.title}
	description={confirm.last?.message}
	closeButton={false}
>
	{#if confirm.last?.checkbox}
		<label class="mt-4 flex items-center gap-2">
			<input type="checkbox" class="checkbox" bind:checked={confirm.checkboxChecked} />
			<span>{confirm.last.checkbox.label}</span>
		</label>
	{/if}

	{#snippet actions()}
		{@const request = confirm.last}
		<button type="button" class="btn btn-ghost" onclick={() => confirm.cancel(request?.id)}>
			{request?.cancelLabel ?? 'Cancel'}
		</button>
		<button
			type="button"
			class={['btn', kindClass[request?.kind ?? 'primary']]}
			onclick={() => confirm.confirm(request?.id)}
		>
			{request?.confirmLabel ?? 'Confirm'}
		</button>
	{/snippet}
</Modal>
