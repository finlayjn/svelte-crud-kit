<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		/** Extra classes appended to the wrapper (e.g. to change the default padding). */
		class?: string;
	}

	let { children, class: className = 'p-4' }: Props = $props();
</script>

<!--
	Full-height flex column for list pages: the header and pagination size to content while the
	DataTable (which uses `flex-1 min-h-0`) fills the remaining space and scrolls internally — so the
	page itself never produces an outer scrollbar (and the navbar shows no scroll shadow).
-->
<div class="flex h-full flex-col gap-0 {className}">
	{@render children()}
</div>
