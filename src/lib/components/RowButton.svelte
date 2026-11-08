<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	/**
	 * The button that opens a `DataTable` row that doesn't navigate (it opens a dialog, say). Put it
	 * around the row's label in its first (row-header) cell, so keyboard and screen-reader users have
	 * a real control; pass the same action to the table's `onRowClick` so a click anywhere else on
	 * the row does the same.
	 */
	interface Props {
		onclick: () => void;
		/** A fuller name for screen readers ("Open the entry from 01/02/2026"). */
		label?: string;
		class?: ClassValue;
		children: Snippet;
	}

	let { onclick, label, class: className, children }: Props = $props();
</script>

<button
	type="button"
	class={['link link-hover text-start', className]}
	aria-label={label}
	{onclick}
>
	{@render children()}
</button>
