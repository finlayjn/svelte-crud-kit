# @finlayjn/svelte-crud-kit

Reusable building blocks for internal admin / CRUD apps: URL-backed paginated + sortable
lists, a snippet-driven data table, pagination, list headers, a nav shell with robust
back-navigation, toasts, confirm dialogs, an unsaved-changes guard, and a small form-field
kit. Everything themes through your app's daisyUI theme — no hardcoded colors.

> **Status:** early / pre-release. APIs will change until `1.0`.

> **AI Disclaimer** — This package was developed with the assistance of AI (GitHub Copilot / Claude Opus 4.8). Users should review code for their specific use case.

## Install

```sh
npm i @finlayjn/svelte-crud-kit
```

Peer dependencies (you almost certainly already have these in a SvelteKit app):
`svelte`, `@sveltejs/kit`, and — if you use the styled components — `tailwindcss` + `daisyui`.
The `@finlayjn/svelte-crud-kit/list` validation helpers additionally use `valibot`.

### Tailwind

So Tailwind scans the library's classes, add an `@source` line to your CSS entry:

```css
@import 'tailwindcss';
@plugin 'daisyui';

@source '../node_modules/@finlayjn/svelte-crud-kit/dist';
```

## Entry points

| Import                             | Contents                                                            |
| ---------------------------------- | ------------------------------------------------------------------- |
| `@finlayjn/svelte-crud-kit`        | Components (DataTable, Pagination, …)                               |
| `@finlayjn/svelte-crud-kit/state`  | Runes controllers (`createListUrl`, …)                              |
| `@finlayjn/svelte-crud-kit/list`   | Framework-free list types + valibot validation (safe on the server) |
| `@finlayjn/svelte-crud-kit/fields` | daisyUI form-field wrappers (inputs, selects, checkboxes, …)        |

## Quick start — a list page

A list page's view state (page, size, sort, search) lives in the URL, so it's shareable and
bookmarkable. The server `load` derives its query from `url.searchParams`, and `createListUrl`
reads/writes those same params on the client.

```ts
// src/routes/widgets/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Number(url.searchParams.get('page') ?? 1);
	const size = Number(url.searchParams.get('size') ?? 25);
	const sort = url.searchParams.get('sort') ?? 'createdAt';
	const dir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';
	const q = url.searchParams.get('q') ?? '';

	// Your data source — return the current slice plus the total row count.
	const { rows, total } = await findWidgets({ page, size, sort, dir, q });
	return { rows, total };
};
```

```svelte
<!-- src/routes/widgets/+page.svelte -->
<script lang="ts">
	import {
		DataTable,
		Pagination,
		ListHeader,
		ListSearch,
		ListPage
	} from '@finlayjn/svelte-crud-kit';
	import type { Column } from '@finlayjn/svelte-crud-kit/list';
	import { createListUrl } from '@finlayjn/svelte-crud-kit/state';

	let { data } = $props();

	// `sortKeys` must match the keys your server accepts.
	const list = createListUrl({
		sortKeys: ['name', 'createdAt'] as const,
		defaultSort: { key: 'createdAt', dir: 'desc' }
	});

	const columns: Column[] = [
		{ key: 'name', label: 'Name', sortable: true },
		{ key: 'createdAt', label: 'Created', sortable: true, align: 'end' }
	];
</script>

<ListPage>
	<ListHeader description="All widgets" stats={[{ label: 'Total', value: data.total }]} />

	<ListSearch initial={list.search} onsearch={list.setSearch} />

	<DataTable {columns} rows={data.rows} sort={list.sort} onsort={list.toggleSort}>
		{#snippet row(widget)}
			<td>{widget.name}</td>
			<td class="text-end">{widget.createdAt}</td>
		{/snippet}
	</DataTable>

	<Pagination
		page={list.page}
		pageSize={list.pageSize}
		total={data.total}
		onpage={list.setPage}
		onpageSize={list.setPageSize}
	/>
</ListPage>
```

Changing the sort, page, page size, or search term updates the URL; SvelteKit re-runs `load`
with the new params and the table re-renders. There is no client-side fetching to wire up.

## App shell & navigation

Mount `AppShell` once in the root layout and pass a `sidebar` snippet built from `NavGroup`,
`NavItem`, and `SidebarFooter`. The shell owns the responsive drawer, the navbar, and layered
back-navigation — the nav content stays entirely yours.

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { AppShell, NavGroup, NavItem, SidebarFooter } from '@finlayjn/svelte-crud-kit';

	let { children, data } = $props();
</script>

<AppShell title={data.title} contentClass="p-4">
	{#snippet sidebar()}
		<NavItem href="/">Dashboard</NavItem>

		<NavGroup id="catalog" title="Catalog" defaultOpen>
			<NavItem href="/widgets">Widgets</NavItem>
			<NavItem href="/gadgets">
				Gadgets
				{#snippet badge()}<span class="badge badge-sm">12</span>{/snippet}
			</NavItem>
		</NavGroup>

		<SidebarFooter name={data.user.name} email={data.user.email}>
			<li><a href="/settings">Settings</a></li>
			<li><a href="/logout">Log out</a></li>
		</SidebarFooter>
	{/snippet}

	{@render children()}
</AppShell>
```

`NavItem`/`NavGroup` highlight themselves against the current URL (filter-aware), and groups
remember their open/closed state across navigations. A page can contribute navbar actions or a
search box, and read the back-navigation state, via `getShell()` from `/state`.

## State controllers

Create the toast and confirm stores once in the root layout and mount their renderers; read them
anywhere below with the matching `get*` helper.

```svelte
<!-- root layout -->
<script lang="ts">
	import { Toaster, ConfirmModal } from '@finlayjn/svelte-crud-kit';
	import { createToasts, createConfirm } from '@finlayjn/svelte-crud-kit/state';

	createToasts();
	createConfirm();
</script>

<!-- …alongside your page content -->
<Toaster />
<ConfirmModal />
```

```ts
import { getToasts, getConfirm, useUnsavedGuard } from '@finlayjn/svelte-crud-kit/state';

const toasts = getToasts();
toasts.success('Saved');

const confirm = getConfirm();
if (await confirm.ask({ title: 'Delete widget?', kind: 'error' })) {
	// …perform the delete
}

// Warn before navigating away from a page with unsaved edits:
useUnsavedGuard(() => draft.isDirty);
```

For inline-editable tables, `SaveTracker` (from `/state`) debounces per-row saves and serializes
in-flight requests so a slow connection can't apply writes out of order; `AutosaveController`
does the same for a single record. See their JSDoc for the full API.

## Development

This is a SvelteKit **library** project (`@sveltejs/package`). `src/lib` is published;
`src/routes` is a local showcase used only for development.

```sh
npm install
npm run dev      # showcase app
npm run check    # types
npm run build    # produces dist/ via svelte-package
```

## License

[MIT](./LICENSE)
