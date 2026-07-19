<script lang="ts">
	import { page } from '$app/state';
	import { getShell } from '../state/shell.svelte.js';

	interface Props {
		/** The `for` id of the drawer toggle, so the hamburger opens the sidebar on mobile. */
		drawerId: string;
		/** Navbar title; falls back to `page.data.pageTitle`. */
		title?: string;
		/**
		 * Whether the content below has scrolled. Adds a separating drop shadow. List pages scroll
		 * inside their own region, so they typically leave this false (no shadow).
		 */
		scrolled?: boolean;
	}

	let { drawerId, title, scrolled = false }: Props = $props();

	const shell = getShell();
	const heading = $derived(title ?? (page.data as { pageTitle?: string }).pageTitle ?? '');
</script>

<header
	class="navbar bg-base-200 z-10 min-h-14 shrink-0 gap-1 px-2 transition-shadow"
	class:border-b={!scrolled}
	class:border-base-300={!scrolled}
	class:shadow-md={scrolled}
>
	<div class="flex min-w-0 shrink items-center gap-1">
		<label for={drawerId} aria-label="Open sidebar" class="btn btn-square btn-ghost lg:hidden">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="size-6"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
		</label>

		{#if shell.canGoBack}
			<button
				type="button"
				onclick={() => shell.back()}
				aria-label="Back"
				class="btn btn-square btn-ghost"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>
		{/if}

		<h1 class="truncate px-1 text-lg font-semibold">{heading}</h1>
	</div>

	<!--
		Middle region: hosts the page's optional search box. A flex-1 spacer even when empty, so the
		page actions stay pinned to the right. Right-aligned on mobile, centred on larger screens.
	-->
	<div class="flex min-w-0 flex-1 justify-end px-1 sm:justify-center sm:px-2">
		{#if shell.search}
			<div class="w-full sm:max-w-sm">{@render shell.search()}</div>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-1">
		{@render shell.actions?.()}
	</div>
</header>
