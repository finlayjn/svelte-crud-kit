<script lang="ts">
	import { getToasts, type ToastKind } from '../state/toast.svelte.js';

	/** Renders the app's toast stack (daisyUI `toast` + `alert`). Place once, in the root layout. */
	const toasts = getToasts();

	const alertClass: Record<ToastKind, string> = {
		info: 'alert-info',
		success: 'alert-success',
		warning: 'alert-warning',
		error: 'alert-error'
	};
</script>

{#if toasts.toasts.length}
	<div class="toast toast-end z-50">
		{#each toasts.toasts as toast (toast.id)}
			<div role="alert" class="alert {alertClass[toast.kind]} shadow-lg">
				<span>{toast.message}</span>
				<button
					type="button"
					class="btn btn-circle btn-ghost btn-xs"
					aria-label="Dismiss"
					onclick={() => toasts.dismiss(toast.id)}
				>
					✕
				</button>
			</div>
		{/each}
	</div>
{/if}
