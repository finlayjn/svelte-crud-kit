<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import { ROW_KEY, type RowContext } from './rowContext.js';

	/** Internal: gives one DataTable row's cells its href, for `RowLink`. Renders no element. */
	let { href, children }: { href: string | undefined; children: Snippet } = $props();

	setContext<RowContext>(ROW_KEY, {
		get href() {
			return href;
		}
	});
</script>

{@render children()}
