<script lang="ts" module>
	export interface Stat {
		label: string;
		value: string | number;
		/** Optional sub-label shown in parentheses after the value. */
		desc?: string;
		/** Optional extra classes for the value (e.g. `text-success` to colour a figure). */
		valueClass?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/**
		 * A sentence describing what this list is currently showing; rendered as the first cell.
		 * Omit to show only the figures (no description cell).
		 */
		description?: string;
		/** Label above the description cell. Defaults to "Description" (avoids repeating the page title). */
		title?: string;
		/** Headline figures, shown as further cells in the same strip (dividers are built in). */
		stats?: Stat[];
		/** Optional richer trailing cell (e.g. a mini schedule), shown as the last cell. */
		extra?: Snippet;
	}

	let { description, title = 'Description', stats = [], extra }: Props = $props();
</script>

<!--
	Responsive layout (custom Tailwind rather than daisyUI's `stat` grid, which can't put the label
	and value on one line): on mobile each item is a compact label-left / value-right row stacked
	vertically; on `sm`+ it becomes the familiar horizontal strip with the value under its label.
-->
<div
	class="divide-base-300 rounded-box border-base-300 bg-base-200 mb-4 flex flex-col divide-y border sm:flex-row sm:divide-x sm:divide-y-0 sm:overflow-x-auto"
>
	{#if description !== undefined}
		<div class="px-4 py-2.5 sm:max-w-md sm:min-w-72 sm:py-3">
			<div class="text-base-content/60 text-xs font-semibold tracking-wide uppercase">{title}</div>
			<p class="text-base-content/80 text-sm sm:mt-1">{description}</p>
		</div>
	{/if}

	{#each stats as stat (stat.label)}
		<div
			class="flex items-baseline justify-between gap-3 px-4 py-2.5 sm:block sm:py-3 sm:whitespace-nowrap"
		>
			<span class="text-base-content/60 text-xs font-medium tracking-wide uppercase sm:block">
				{stat.label}
			</span>
			<span class="text-lg font-semibold sm:mt-1 sm:block sm:text-2xl {stat.valueClass ?? ''}">
				{stat.value}
				{#if stat.desc}
					<span class="text-base-content/60 text-xs font-normal">({stat.desc})</span>
				{/if}
			</span>
		</div>
	{/each}

	{#if extra}
		<div class="px-4 py-2.5 sm:py-3">
			{@render extra()}
		</div>
	{/if}
</div>
