<script lang="ts">
	import { getContext, onMount, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import { isActiveLink } from '../list/index.js';
	import { getShell } from '../state/shell.svelte.js';
	import { NAV_GROUP_KEY, type NavGroupApi } from './navContext.js';

	interface Props {
		/** Root-relative link target, optionally with a query string. */
		href: string;
		/** Active-match strategy: `exact` (filter-aware, default) or `prefix` (nested routes). */
		match?: 'exact' | 'prefix';
		/** Optional leading icon snippet. */
		icon?: Snippet;
		/** The link label / contents. */
		children: Snippet;
		/**
		 * Optional trailing content (e.g. a count badge), pinned right and inset by the same gutter a
		 * `NavGroup`'s chevron occupies, so item counts and group counts line up in a column.
		 */
		badge?: Snippet;
	}

	let { href, match = 'exact', icon, children, badge }: Props = $props();

	const shell = getShell();
	const group = getContext<NavGroupApi | undefined>(NAV_GROUP_KEY);

	// Register with the enclosing group (if any) so ancestors know this link exists and can
	// auto-expand when it becomes active. `register` returns the unregister cleanup for unmount.
	onMount(() => group?.register(href));

	const active = $derived(isActiveLink(page.url, href, match));

	/**
	 * A sidebar link is a top-level navigation: it should clear the in-app back trail (you're jumping
	 * to a new section, not drilling deeper), so the back button doesn't bounce across sections.
	 */
	function onclick() {
		shell.markTopLevelNavigation();
	}
</script>

<li>
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href} class:menu-active={active} {onclick}>
		{#if icon}{@render icon()}{/if}
		{@render children()}
		{#if badge}<span class="ms-auto me-6">{@render badge()}</span>{/if}
	</a>
</li>
