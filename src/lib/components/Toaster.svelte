<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { getToasts, type ToastKind } from '../state/toast.svelte.js';

	/**
	 * Renders the app's toast stack (daisyUI `toast` + `alert`). Place once, in the root layout.
	 *
	 * The stack is a manual popover, so it sits in the top layer and shows above open modal
	 * dialogs. Countdowns pause while the stack is hovered or focused. Errors and warnings are
	 * announced as alerts, the rest politely.
	 */
	const toasts = getToasts();

	const alertClass: Record<ToastKind, string> = {
		info: 'alert-info',
		success: 'alert-success',
		warning: 'alert-warning',
		error: 'alert-error'
	};

	/** Shows the stack in the top layer; re-raises it above a modal opened since (count changes). */
	function topLayer(count: number): Attachment<HTMLElement> {
		return (stack) => {
			if (count === 0 || typeof stack.showPopover !== 'function') return;
			if (!stack.matches(':popover-open')) {
				stack.showPopover();
			} else if (document.querySelector('dialog:modal')) {
				stack.hidePopover();
				stack.showPopover();
			}
		};
	}

	const pauseOnHover: Attachment<HTMLElement> = (stack) => {
		const pause = () => toasts.pause();
		const resume = () => {
			if (!stack.matches(':hover') && !stack.contains(document.activeElement)) toasts.resume();
		};
		const onFocusOut = (event: FocusEvent) => {
			if (!stack.contains(event.relatedTarget as Node | null)) resume();
		};
		stack.addEventListener('pointerenter', pause);
		stack.addEventListener('pointerleave', resume);
		stack.addEventListener('focusin', pause);
		stack.addEventListener('focusout', onFocusOut);
		return () => {
			stack.removeEventListener('pointerenter', pause);
			stack.removeEventListener('pointerleave', resume);
			stack.removeEventListener('focusin', pause);
			stack.removeEventListener('focusout', onFocusOut);
			toasts.resume();
		};
	};
</script>

{#if toasts.toasts.length}
	<!-- m-0, p-0, border-0 and overflow-visible undo the browser's popover styles. -->
	<div
		popover="manual"
		class="toast toast-end text-base-content z-50 m-0 overflow-visible border-0 p-0"
		{@attach topLayer(toasts.toasts.length)}
		{@attach pauseOnHover}
	>
		{#each toasts.toasts as toast (toast.id)}
			<div
				role={toast.kind === 'error' || toast.kind === 'warning' ? 'alert' : 'status'}
				class="alert {alertClass[toast.kind]} shadow-lg"
			>
				<span>{toast.message}</span>
				<button
					type="button"
					class="btn btn-circle btn-ghost btn-sm"
					aria-label="Dismiss"
					onclick={() => toasts.dismiss(toast.id)}
				>
					✕
				</button>
			</div>
		{/each}
	</div>
{/if}
