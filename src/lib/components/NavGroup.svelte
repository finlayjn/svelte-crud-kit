<script lang="ts">
	import { getContext, onMount, setContext, type Snippet } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { isActiveLink } from '../list/index.js';
	import { getShell } from '../state/shell.svelte.js';
	import { NAV_GROUP_KEY, type NavGroupApi } from './navContext.js';

	interface Props {
		/** Stable id used to remember this group's open/closed state across navigations. */
		id: string;
		/** Group label shown in the summary row. */
		title: string;
		/** Optional leading icon snippet. */
		icon?: Snippet;
		/** Whether the group starts expanded when the user has no stored preference for it. */
		defaultOpen?: boolean;
		/** Optional trailing content (e.g. a count badge), shown just before the chevron. */
		badge?: Snippet;
		/** The group's contents (nested `NavGroup` / `NavItem`). */
		children: Snippet;
	}

	let { id, title, icon, defaultOpen = false, badge, children }: Props = $props();

	const shell = getShell();
	const parent = getContext<NavGroupApi | undefined>(NAV_GROUP_KEY);

	// Descendant links registered by child NavItems (and forwarded up from nested groups). Reactive,
	// so `containsActive` recomputes as the current route changes.
	const hrefs = new SvelteSet<string>();
	const api: NavGroupApi = {
		register(href) {
			hrefs.add(href);
			const up = parent?.register(href);
			return () => {
				hrefs.delete(href);
				up?.();
			};
		}
	};
	setContext(NAV_GROUP_KEY, api);

	/**
	 * True when the current route is at or beneath one of this group's descendant links. Uses
	 * `prefix` matching (path-level) so the group counts as active for any page under a descendant
	 * link — including nested detail routes and filtered variants of a list.
	 */
	const containsActive = $derived(
		[...hrefs].some((href) => isActiveLink(page.url, href, 'prefix'))
	);

	/**
	 * Open state is the user's stored choice (or the default) — so any group can be freely collapsed,
	 * including the one holding the current page. Navigating *into* a group auto-expands it (below),
	 * matching the familiar file-tree behaviour of VS Code, Notion, etc.
	 */
	const open = $derived(shell.isGroupOpen(id, defaultOpen));

	function toggle() {
		shell.setGroupOpen(id, !open);
	}

	// Auto-expand this group when navigation *enters* it (a false→true rising edge), so a deep-linked
	// page reveals its ancestor chain. Tracking the previous value means paging/sorting *within* the
	// group — or the user having deliberately collapsed it — won't force it back open.
	let wasContainingActive = false;

	onMount(() => {
		if (containsActive) shell.setGroupOpen(id, true);
		wasContainingActive = containsActive;
	});

	afterNavigate(() => {
		if (containsActive && !wasContainingActive) shell.setGroupOpen(id, true);
		wasContainingActive = containsActive;
	});
</script>

<li>
	<button
		type="button"
		class="flex items-center gap-2"
		class:menu-active={containsActive && !open}
		aria-expanded={open}
		onclick={toggle}
	>
		{#if icon}{@render icon()}{/if}
		<span class="flex-1 text-start">{title}</span>
		{#if badge}{@render badge()}{/if}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="size-4 shrink-0 transition-transform {open ? 'rotate-90' : ''}"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</button>
	<!--
		The items are always rendered (only visually hidden when collapsed) so their `NavItem`s stay
		mounted and keep their hrefs registered. That's what lets a collapsed group know it contains the
		active route and auto-expand when you deep-link into one of its pages.
	-->
	<ul class:hidden={!open}>
		{@render children()}
	</ul>
</li>
