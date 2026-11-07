<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import { ROW_KEY, type RowContext } from './rowContext.js';

	/**
	 * The link that makes a `DataTable` row navigable. Put it around the row's label in its first
	 * (row-header) cell; it takes its href from the table's `rowHref`. It's a real `<a>`, so keyboard
	 * users reach it with Tab and Cmd/Ctrl/middle-click and "Copy link" work. Clicks elsewhere on the
	 * row follow it too.
	 */
	interface Props {
		/** Overrides the href the table's `rowHref` gives this row. */
		href?: string;
		class?: ClassValue;
		children: Snippet;
	}

	let { href, class: className, children }: Props = $props();

	const row = getContext<RowContext | undefined>(ROW_KEY);
	const target = $derived(href ?? row?.href);
</script>

{#if target}
	<!-- eslint-disable svelte/no-navigation-without-resolve -- the href comes from the caller -->
	<a href={target} data-row-link class={['link link-hover', className]}>{@render children()}</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
{:else}
	{@render children()}
{/if}
