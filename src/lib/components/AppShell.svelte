<script lang="ts">
	import type { Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { createShell, defaultResolveParent, type ShellOptions } from '../state/shell.svelte.js';
	import Navbar from './Navbar.svelte';

	interface Props {
		/** The sidebar contents (usually `NavGroup` / `NavItem` building blocks). */
		sidebar: Snippet;
		/** The routed page content. */
		children: Snippet;
		/** Navbar title; falls back to `page.data.pageTitle`. */
		title?: string;
		/** Custom logical-parent resolver for back navigation (see {@link ShellOptions}). */
		resolveParent?: ShellOptions['resolveParent'];
		/** The drawer toggle id (only change it if you mount more than one shell). */
		drawerId?: string;
		/** Extra classes for the scrolling `<main>` region (e.g. `p-4` for a default content gutter). */
		contentClass?: string;
	}

	let {
		sidebar,
		children,
		title,
		resolveParent,
		drawerId = 'crud-kit-drawer',
		contentClass = ''
	}: Props = $props();

	const shell = createShell({
		// Wrapped in a closure so the (config-only) prop is read at call time rather than captured once,
		// falling back to the default segment-stripping resolver when the consumer supplies none.
		resolveParent: (url) => (resolveParent ?? defaultResolveParent)(url)
	});

	/** Mobile drawer open state; closed automatically after any navigation. */
	let drawerOpen = $state(false);
	/** Whether the main content is scrolled, so the navbar can show a separating shadow. */
	let scrolled = $state(false);

	afterNavigate((nav) => {
		shell.recordNavigation(nav);
		drawerOpen = false;
	});
</script>

<div class="drawer lg:drawer-open">
	<input id={drawerId} type="checkbox" class="drawer-toggle" bind:checked={drawerOpen} />

	<div class="drawer-content flex h-screen flex-col">
		<Navbar {drawerId} {title} {scrolled} />
		<main
			class="min-h-0 flex-1 overflow-auto {contentClass}"
			onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 0)}
		>
			{@render children()}
		</main>
	</div>

	<div class="drawer-side z-20">
		<label for={drawerId} aria-label="Close sidebar" class="drawer-overlay"></label>
		{@render sidebar()}
	</div>
</div>
