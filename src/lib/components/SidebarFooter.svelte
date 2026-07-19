<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Primary line — usually the signed-in user's name. */
		name: string;
		/** Secondary muted line — usually the email. Omitted when not provided. */
		email?: string;
		/** Optional leading visual (e.g. a daisyUI `avatar`), shown left of the name/email. */
		avatar?: Snippet;
		/**
		 * Optional action links, rendered as a daisyUI `menu` below the identity block. Provide `<li>`
		 * items (or `NavItem`s) — e.g. Settings and Log out.
		 */
		children?: Snippet;
	}

	let { name, email, avatar, children }: Props = $props();
</script>

<!--
	Pinned sidebar footer (identity + actions). Place it as the last child of a fixed-height,
	`flex flex-col` sidebar whose nav region scrolls (`flex-1 overflow-y-auto`). `shrink-0` keeps this
	block from collapsing, so it stays put while the nav above scrolls.
-->
<div class="border-base-300 shrink-0 border-t p-2">
	<div class="flex items-center gap-3 px-2 py-1.5">
		{#if avatar}{@render avatar()}{/if}
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold">{name}</p>
			{#if email}
				<p class="text-base-content/60 truncate text-xs">{email}</p>
			{/if}
		</div>
	</div>
	{#if children}
		<ul class="menu w-full gap-0.5 p-0 text-base lg:text-sm">
			{@render children()}
		</ul>
	{/if}
</div>
