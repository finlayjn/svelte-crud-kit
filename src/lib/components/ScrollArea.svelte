<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { ClassValue } from 'svelte/elements';

	/**
	 * A vertical scroller that shades its top or bottom edge while there's more to scroll that way.
	 *
	 * It fills its parent's height in a flex column (`flex-1 min-h-0`). In a height-capped flex
	 * column (a modal box with a list), give its siblings (heading, inputs, actions) `shrink-0`:
	 * the scroller's basis resolves to its content height when the column is only capped, so a long
	 * list makes flex shrink every child, and an input can shrink far below its daisyUI size.
	 *
	 * The scroller is positioned, so absolutely positioned content inside it (`sr-only` text) is
	 * clipped instead of stretching the page. In a modal, `class="-mx-6"` with `contentClass="px-6"`
	 * runs it edge to edge so the scrollbar sits at the box's right edge.
	 */
	interface Props {
		/** Classes for the outer box (sizing, bleed). */
		class?: ClassValue;
		/** Classes for the content inside the scroller (padding). */
		contentClass?: ClassValue;
		/**
		 * Names the scroller and makes it focusable (a labeled region), so keyboard users can scroll
		 * it. Set it when the content may hold no focusable control.
		 */
		label?: string;
		children: Snippet;
	}

	let { class: className, contentClass, label, children }: Props = $props();

	let moreAbove = $state(false);
	let moreBelow = $state(false);

	function measure(scroller: HTMLElement) {
		moreAbove = scroller.scrollTop > 0;
		moreBelow = scroller.scrollTop + scroller.clientHeight < scroller.scrollHeight - 1;
	}

	// Content can grow or shrink without a scroll (results loading), so re-measure on resize.
	const track: Attachment<HTMLElement> = (scroller) => {
		const observer = new ResizeObserver(() => measure(scroller));
		observer.observe(scroller);
		if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
		return () => observer.disconnect();
	};
</script>

<div class={['relative flex min-h-0 flex-1 flex-col', className]}>
	<!-- A labeled scroller has to be focusable so keyboard users can scroll it. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="focus-visible:outline-primary relative min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2"
		role={label ? 'region' : undefined}
		aria-label={label}
		tabindex={label ? 0 : undefined}
		onscroll={(event) => measure(event.currentTarget)}
		{@attach track}
	>
		<div class={contentClass}>{@render children()}</div>
	</div>
	<div
		aria-hidden="true"
		class={[
			'from-base-content/15 pointer-events-none absolute inset-x-0 top-0 h-4 bg-linear-to-b to-transparent transition-opacity motion-reduce:transition-none',
			moreAbove ? 'opacity-100' : 'opacity-0'
		]}
	></div>
	<div
		aria-hidden="true"
		class={[
			'from-base-content/15 pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-linear-to-t to-transparent transition-opacity motion-reduce:transition-none',
			moreBelow ? 'opacity-100' : 'opacity-0'
		]}
	></div>
</div>
