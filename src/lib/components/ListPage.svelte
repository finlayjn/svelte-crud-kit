<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';

	interface Props {
		children: Snippet;
		/** Whether to apply the default `p-4` padding (turn off to set your own through `class`). */
		padded?: boolean;
		/** Extra classes appended to the wrapper. */
		class?: ClassValue;
	}

	let { children, padded = true, class: className }: Props = $props();
</script>

<!--
	Full-height flex column for list pages: the header and pagination size to content while the
	DataTable (which uses `flex-1 min-h-0`) fills the remaining space and scrolls internally — so the
	page itself never produces an outer scrollbar (and the navbar shows no scroll shadow).
-->
<div class={['flex h-full flex-col gap-0', padded && 'p-4', className]}>
	{@render children()}
</div>
