<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import { createShell, defaultResolveParent, type ShellOptions } from '../state/shell.svelte.js';
	import Navbar from './Navbar.svelte';

	interface Props {
		/** The sidebar contents (usually `NavGroup` / `NavItem` building blocks). */
		sidebar: Snippet;
		/** The routed page content. */
		children: Snippet;
		/** Navbar title; falls back to `page.data.pageTitle`, then `page.data.title`. */
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
	let main: HTMLElement | undefined;
	let side: HTMLElement | undefined;

	const sidebarId = $derived(`${drawerId}-side`);
	const menuButtonId = $derived(`${drawerId}-button`);

	afterNavigate((nav) => {
		shell.recordNavigation(nav);
		drawerOpen = false;
		if (!main || !nav.from || !nav.to || nav.type === 'popstate') return;
		if (nav.from.url.pathname === nav.to.url.pathname) return;
		// The browser restores only the window's scroll, and <main> is the scroller here.
		if (!nav.to.url.hash) main.scrollTop = 0;
		// Kit leaves focus on <body> (unless keepFocus or autofocus moved it); move it into the
		// scroller so Space and Page Down scroll the page.
		if (document.activeElement === document.body) main.focus({ preventScroll: true });
	});

	async function toggleMenu() {
		drawerOpen = !drawerOpen;
		if (!drawerOpen) return;
		await tick();
		side
			?.querySelector<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')
			?.focus();
	}

	function closeMenu() {
		drawerOpen = false;
		document.getElementById(menuButtonId)?.focus();
	}
</script>

<svelte:window
	onkeydown={(event) => {
		if (drawerOpen && event.key === 'Escape') closeMenu();
	}}
/>

<div class="drawer lg:drawer-open">
	<input
		id={drawerId}
		type="checkbox"
		class="drawer-toggle"
		tabindex="-1"
		aria-hidden="true"
		bind:checked={drawerOpen}
	/>

	<div class="drawer-content flex h-dvh flex-col">
		<Navbar
			{drawerId}
			{title}
			{scrolled}
			menuOpen={drawerOpen}
			onmenu={toggleMenu}
			{menuButtonId}
			menuControls={sidebarId}
		/>
		<main
			bind:this={main}
			tabindex="-1"
			class="relative min-h-0 flex-1 overflow-auto focus:outline-none {contentClass}"
			onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 0)}
		>
			{@render children()}
		</main>
	</div>

	<div id={sidebarId} class="drawer-side z-20" bind:this={side}>
		<label for={drawerId} aria-label="Close sidebar" class="drawer-overlay"></label>
		{@render sidebar()}
	</div>
</div>
