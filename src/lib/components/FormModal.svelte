<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import Modal from './Modal.svelte';

	/**
	 * A `Modal` holding a form, with Cancel and a submit button: the "New widget" kind of dialog.
	 * While `onsubmit` runs the modal is busy (not dismissible, the submit button shows
	 * `busyLabel`). Close it from `onsubmit` when it succeeds (`open = false`), and reset the fields
	 * in `onclosed`.
	 */
	interface Props {
		open?: boolean;
		title: string;
		description?: string;
		/** The submit button's text ("Create widget"). */
		submitLabel: string;
		/** The submit button's text while submitting (default "Working…"). */
		busyLabel?: string;
		cancelLabel?: string;
		/** Whether the form can be submitted (e.g. a required field is filled). */
		canSubmit?: boolean;
		/** Called on submit when allowed; the modal stays busy until it settles. */
		onsubmit: () => unknown | Promise<unknown>;
		/** Busy from outside too (e.g. a step before the submit). */
		busy?: boolean;
		onclosed?: () => void;
		class?: ClassValue;
		/** The form's fields. */
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description,
		submitLabel,
		busyLabel = 'Working…',
		cancelLabel = 'Cancel',
		canSubmit = true,
		onsubmit,
		busy = false,
		onclosed,
		class: className,
		children
	}: Props = $props();

	const formId = $props.id();
	let submitting = $state(false);
	const working = $derived(busy || submitting);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (working || !canSubmit) return;
		submitting = true;
		try {
			await onsubmit();
		} finally {
			submitting = false;
		}
	}
</script>

<Modal bind:open {title} {description} busy={working} {onclosed} class={className}>
	<form id={formId} class="flex flex-col gap-4 pt-4" onsubmit={submit}>
		{@render children()}
	</form>
	{#snippet actions()}
		<button
			type="button"
			class="btn btn-ghost"
			aria-disabled={working}
			onclick={() => {
				if (!working) open = false;
			}}
		>
			{cancelLabel}
		</button>
		<button
			type="submit"
			form={formId}
			class="btn btn-primary"
			aria-disabled={working || !canSubmit}
		>
			{working ? busyLabel : submitLabel}
		</button>
	{/snippet}
</Modal>
