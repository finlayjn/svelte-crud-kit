<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	/**
	 * A daisyUI modal on a native `<dialog>`. Set `open` (bindable) to show or hide it; Esc, the
	 * backdrop and the ✕ button close it by setting `open` to false.
	 *
	 * - While `busy`, it can't be dismissed (Esc, backdrop and ✕ are ignored); close it from code.
	 * - Content stays mounted through the exit animation, and `onclosed` fires after it, so reset
	 *   form state there rather than as it closes.
	 * - Focus returns to the element that had it when the modal opened.
	 * - Closing it closes any modal dialogs open inside it first.
	 * - It animates in even when created and opened at once (`{#if show}<Modal open />{/if}`), and
	 *   when nested inside another open modal.
	 *
	 * Size it with `class` on the box (e.g. `max-w-2xl`). For a long list, make the box a flex
	 * column (`class="flex flex-col"`) with a `ScrollArea` in it; the title and actions don't shrink.
	 * daisyUI already locks page scroll while a modal is open.
	 */
	interface Props {
		/** Whether the modal is shown. */
		open?: boolean;
		/** Heading, also the dialog's accessible name. */
		title?: string;
		/** Accessible name when there's no visible `title`. */
		label?: string;
		/** Text under the title, also the dialog's accessible description. */
		description?: string;
		/** While true, Esc, the backdrop and ✕ don't close the modal. */
		busy?: boolean;
		/** Show a ✕ button in the corner (default true). */
		closeButton?: boolean;
		/** Classes for the `modal-box` (size, layout). */
		class?: ClassValue;
		/** The modal's body. */
		children: Snippet;
		/** Buttons for the footer, rendered in a `modal-action` row. */
		actions?: Snippet;
		/** Called once the modal has closed and its exit animation has finished. */
		onclosed?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		label,
		description,
		busy = false,
		closeButton = true,
		class: className,
		children,
		actions,
		onclosed
	}: Props = $props();

	const id = $props.id();
	let dialog = $state<HTMLDialogElement>();
	/** True from the close event until the exit animation ends, to keep the content mounted. */
	let closing = $state(false);
	const rendered = $derived(open || closing);
	/** Bumped on each close, so a slow exit animation can't finish a later close. */
	let closeCount = 0;
	let opener: HTMLElement | null = null;

	// Syncs the native dialog with `open` (a DOM side effect).
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
			dialog.showModal();
		} else if (!open && dialog.open) {
			for (const child of [...dialog.querySelectorAll('dialog')].reverse()) {
				if (child.open) child.close();
			}
			dialog.close();
		}
	});

	function dismiss() {
		if (!busy) open = false;
	}

	async function handleClose() {
		if (!dialog || dialog.open) return; // A stale event: the modal has been reopened since.
		if (open && busy) {
			dialog.showModal(); // The browser closed it anyway; busy modals stay open.
			return;
		}
		open = false;
		closing = true;
		const count = ++closeCount;
		if (opener?.isConnected && !dialog.contains(opener)) {
			const active = document.activeElement;
			if (!active || active === document.body || dialog.contains(active)) opener.focus();
		}
		await Promise.allSettled(
			dialog.getAnimations({ subtree: true }).map((animation) => animation.finished)
		);
		if (open) {
			closing = false;
			return;
		}
		if (count !== closeCount) return;
		closing = false;
		onclosed?.();
	}
</script>

<dialog
	bind:this={dialog}
	class="modal"
	aria-labelledby={title ? `${id}-title` : undefined}
	aria-label={title ? undefined : label}
	aria-describedby={description ? `${id}-description` : undefined}
	oncancel={(event) => {
		if (busy) event.preventDefault();
	}}
	onclose={handleClose}
>
	{#if rendered}
		<div class={['modal-box', className]}>
			{#if closeButton}
				<button
					type="button"
					class="btn btn-circle btn-ghost btn-sm absolute top-2 right-2"
					aria-label="Close"
					aria-disabled={busy}
					onclick={dismiss}
				>
					✕
				</button>
			{/if}
			{#if title}
				<h2 id="{id}-title" class={['shrink-0 text-lg font-bold', closeButton && 'pe-8']}>
					{title}
				</h2>
			{/if}
			{#if description}
				<p id="{id}-description" class="text-base-content/80 shrink-0 pt-2">{description}</p>
			{/if}
			{@render children()}
			{#if actions}
				<div class="modal-action shrink-0">{@render actions()}</div>
			{/if}
		</div>
	{/if}
	<form method="dialog" class="modal-backdrop">
		<button
			tabindex="-1"
			onclick={(event) => {
				if (busy) event.preventDefault();
			}}>close</button
		>
	</form>
</dialog>

<style>
	/* A box created with its dialog has no closed state to animate from; give it one. */
	@starting-style {
		dialog[open] .modal-box {
			opacity: 0;
			scale: 0.95;
		}
	}

	/* daisyUI's `.modal[open] .modal-box` also matches a closed modal nested in an open one. */
	dialog:not([open]) .modal-box {
		opacity: 0;
		scale: 0.95;
	}
</style>
