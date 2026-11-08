<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	/**
	 * A soft shadow along an edge, for "there's more beyond here" (a scroller's top or bottom) and
	 * for a bar the page scrolls under. Shared by the navbar and `ScrollArea` so they match.
	 *
	 * It's always black, never the text color (which turns white in dark themes). Black needs more
	 * opacity to show on a dark background, so the strength follows the theme's text lightness:
	 * about 9% at the edge in a light theme and 48% in a dark one, fading out over 12px. Browsers
	 * without relative colors get a plain 10% black.
	 */
	interface Props {
		/** The edge the shadow starts from; it fades away from it. */
		side: 'top' | 'bottom';
		visible?: boolean;
		/** Positioning; defaults to the parent's top or bottom edge (the parent must be positioned). */
		class?: ClassValue;
	}

	let { side, visible = true, class: className }: Props = $props();

	const direction = $derived(side === 'top' ? 'to bottom' : 'to top');
	const style = $derived(
		`background-image: linear-gradient(${direction}, rgb(0 0 0 / 0.1), transparent);` +
			`background-image: linear-gradient(${direction}, oklch(from var(--color-base-content) 0 0 0 / calc(l * 0.55 - 0.03)), transparent);`
	);
</script>

<div
	aria-hidden="true"
	class={[
		'pointer-events-none absolute inset-x-0 z-10 h-3 transition-opacity motion-reduce:transition-none',
		className ?? (side === 'top' ? 'top-0' : 'bottom-0'),
		visible ? 'opacity-100' : 'opacity-0'
	]}
	{style}
></div>
