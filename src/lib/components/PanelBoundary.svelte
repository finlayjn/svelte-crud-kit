<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Keeps one independent panel's rendering error from taking down the page: the panel is replaced
	 * by a short message with Try again, and the error is logged (or passed to `onerror`).
	 */
	interface Props {
		/** What the panel shows, for the default message ("Couldn't show {label}."). */
		label: string;
		children: Snippet;
		/** Replaces the default message. */
		message?: string;
		retryLabel?: string;
		/** Called with the error; defaults to `console.error`. */
		onerror?: (error: unknown) => void;
		/** Replaces the whole failure UI; call `reset` to try again. */
		failed?: Snippet<[unknown, () => void]>;
	}

	let {
		label,
		children,
		message,
		retryLabel = 'Try again',
		onerror = (error) => console.error(`[panel] showing ${label} failed`, error),
		failed: customFailed
	}: Props = $props();
</script>

<svelte:boundary {onerror}>
	{@render children()}

	{#snippet failed(error, reset)}
		{#if customFailed}
			{@render customFailed(error, reset)}
		{:else}
			<div role="alert" class="alert alert-error">
				<span>{message ?? `Couldn’t show ${label}.`}</span>
				<button type="button" class="btn btn-sm" onclick={reset}>{retryLabel}</button>
			</div>
		{/if}
	{/snippet}
</svelte:boundary>
