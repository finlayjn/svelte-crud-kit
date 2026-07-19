<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { createConfirm, createToasts } from '$lib/state/index.js';
	import { ConfirmModal, Toaster, AppShell, NavGroup, NavItem, SidebarFooter } from '$lib/index.js';

	let { children }: { children: Snippet } = $props();

	createConfirm();
	createToasts();
</script>

<AppShell title="svelte-crud-kit">
	{#snippet sidebar()}
		<!--
			Fixed-height flex column so the nav list scrolls on its own and the footer stays pinned.
			daisyUI's `.drawer-side` is the scroll container (100dvh + overflow-y-auto), so a plain
			`min-h-full` wrapper would let the whole sidebar — footer included — scroll as one block.
			`h-dvh` + a `flex-1 overflow-y-auto` nav region keeps the drawer itself from scrolling.
		-->
		<div class="bg-base-200 text-base-content flex h-dvh w-72 flex-col">
			<div class="shrink-0 p-4 text-lg font-bold">svelte-crud-kit</div>
			<ul class="menu w-full flex-1 flex-nowrap gap-0.5 overflow-y-auto px-2 pb-4">
				<NavGroup id="records" title="Records" defaultOpen>
					<NavItem href="/">All records</NavItem>
					<NavItem href="/?role=Admin">Admins</NavItem>
					<NavItem href="/?role=Editor">Editors</NavItem>
				</NavGroup>
				<NavGroup id="settings" title="Settings">
					<NavItem href="/settings" match="prefix">General</NavItem>
				</NavGroup>
				<NavItem href="/fields">Fields kit</NavItem>
			</ul>

			<SidebarFooter name="Ada Lovelace" email="ada@example.com">
				{#snippet avatar()}
					<div class="avatar avatar-placeholder">
						<div class="bg-neutral text-neutral-content w-9 rounded-full">
							<span class="text-sm">AL</span>
						</div>
					</div>
				{/snippet}
				<NavItem href="/settings" match="prefix">
					{#snippet icon()}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							class="size-5 shrink-0"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
							/>
						</svg>
					{/snippet}
					Settings
				</NavItem>
			</SidebarFooter>
		</div>
	{/snippet}

	{@render children()}
</AppShell>

<ConfirmModal />
<Toaster />
