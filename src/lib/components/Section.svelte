<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * A titled form section, always rendered as a daisyUI `card`. The card *content* is collapsible on
	 * mobile only: below `sm` it's a daisyUI `collapse` accordion (tap the title to expand); from `sm`
	 * up `collapse-open` forces it open and the chrome (arrow, toggle, pointer cursor) is removed so
	 * the title reads as a plain heading. The title is a real heading (`h2` by default).
	 *
	 * The collapse uses the checkbox method rather than `<details>`, because daisyUI's `collapse-open`
	 * modifier (which drives the desktop "always open" behavior) only works with the checkbox/focus
	 * methods, not with `<details>`.
	 */
	interface Props {
		title: string;
		/** Whether the section starts expanded on mobile. */
		open?: boolean;
		/** Optional id for the section card, used as a scroll-spy anchor target. */
		id?: string;
		/** Heading level of the title (default 2). */
		level?: 2 | 3 | 4;
		children: Snippet;
	}

	let { title, open = false, id, level = 2, children }: Props = $props();
</script>

<div {id} class="card border-base-300 bg-base-100 border">
	<div class="collapse-arrow sm:collapse-open collapse">
		<input type="checkbox" checked={open} class="sm:hidden" aria-label={title} />
		<svelte:element
			this={`h${level}`}
			class="collapse-title text-lg font-semibold sm:cursor-default sm:after:hidden"
		>
			{title}
		</svelte:element>
		<div class="collapse-content">
			<div class="flex flex-col gap-4 pt-2">
				{@render children()}
			</div>
		</div>
	</div>
</div>
