<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		/** Number of columns from `sm` up (one column on mobile). */
		cols?: 1 | 2 | 3 | 4;
		class?: string;
	}

	let { children, cols = 2, class: className = '' }: Props = $props();

	// Static class map so Tailwind can see the utilities (dynamic `sm:grid-cols-${n}` would be purged).
	const colClass: Record<NonNullable<Props['cols']>, string> = {
		1: 'sm:grid-cols-1',
		2: 'sm:grid-cols-2',
		3: 'sm:grid-cols-3',
		4: 'sm:grid-cols-4'
	};
</script>

<div class="grid grid-cols-1 gap-4 {colClass[cols]} {className}">
	{@render children()}
</div>
