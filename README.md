# @finlayjn/svelte-crud-kit

Reusable building blocks for internal admin / CRUD apps: URL-backed paginated + sortable
lists, a snippet-driven data table, pagination, list headers, a nav shell with robust
back-navigation, dialogs, toasts, confirm dialogs, an unsaved-changes guard, save engines
(autosave, manual Save, and compare-and-set edits with conflict handling), a small form-field
kit, and light / dark / system themes without a flash. Everything takes its colors from your
app's daisyUI theme; the one exception is the edge shadow, which is always black so it shows in
dark themes too.

> **Status:** early / pre-release. APIs will change until `1.0`.

> **AI Disclaimer** — This package was developed with the assistance of AI (Claude Opus 5.5). Users should review code for their specific use case.

## Install

```sh
npm i @finlayjn/svelte-crud-kit
```

Peer dependencies (you almost certainly already have these in a SvelteKit app):
`svelte` (5.29+), `@sveltejs/kit` (2.12+), and — if you use the styled components —
`tailwindcss` + `daisyui`, and `valibot`, which `@finlayjn/svelte-crud-kit/list` imports (its
schemas and `parseListParams`); the other entry points don't use it.

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
| `@finlayjn/svelte-crud-kit`        | Components (DataTable, Pagination, Modal, ScrollArea, …)            |
| `@finlayjn/svelte-crud-kit/state`  | Runes controllers (`createListUrl`, `SaveGroup`, …)                 |
| `@finlayjn/svelte-crud-kit/list`   | Framework-free list types + valibot validation (safe on the server) |
| `@finlayjn/svelte-crud-kit/fields` | daisyUI form-field wrappers (inputs, selects, checkboxes, …)        |
| `@finlayjn/svelte-crud-kit/theme`  | Light / dark / system themes, framework-free (`createThemes`)       |

## Quick start — a list page

A list page's view state (page, size, sort, search) lives in the URL, so it's shareable and
bookmarkable. The server `load` reads it with `parseListParams`, and `createListUrl` reads and
writes the same params on the client, with the same parser.

```ts
// src/routes/widgets/+page.server.ts
import { parseListParams } from '@finlayjn/svelte-crud-kit/list';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const { page, pageSize, sortKey, sortDir, search } = parseListParams(url, {
		sortKeys: ['name', 'createdAt'],
		defaultSort: { key: 'createdAt', dir: 'desc' }
	});

	// Your data source — return the current slice plus the total row count.
	const { rows, total } = await findWidgets({ page, pageSize, sortKey, sortDir, search });
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
		ListPage,
		RowLink
	} from '@finlayjn/svelte-crud-kit';
	import type { Column } from '@finlayjn/svelte-crud-kit/list';
	import { createListUrl } from '@finlayjn/svelte-crud-kit/state';
	import { resolve } from '$app/paths';

	let { data } = $props();

	// Same options as the server's parseListParams call.
	const list = createListUrl({
		sortKeys: ['name', 'createdAt'],
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

	<DataTable
		{columns}
		rows={data.rows}
		rowKey={(widget) => widget.id}
		rowHref={(widget) => resolve('/widgets/[id]', { id: String(widget.id) })}
		sort={list.sort}
		onsort={list.toggleSort}
	>
		{#snippet row(widget)}
			<th><RowLink>{widget.name}</RowLink></th>
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

`RowLink` is the row's real link (keyboard, Cmd/middle-click and Copy link work); a click
anywhere else on the row follows it too. For rows that don't navigate (they open a dialog, say),
put `RowButton` around the label in the first cell and pass the same action to `onRowClick`, so
keyboard users get a real button and a click anywhere on the row does the same.

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
				{#snippet badge()}<span class="badge badge-neutral badge-sm">12</span>{/snippet}
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
remember their open/closed state across navigations. After a navigation to another path the
shell scrolls its `<main>` to the top and moves focus into it; Back and Forward restore each
page's scroll position instead. The navbar slots (below) are cleared whenever the route changes,
so a page's navbar buttons never render with the next page's data.

A page puts buttons or a search box in the navbar with `useShellSlots`. The slots clear when the
page unmounts (unless the next page has already taken them). Pass a getter for reactive slots:

```svelte
<script lang="ts">
	import { useShellSlots } from '@finlayjn/svelte-crud-kit/state';

	let { data } = $props();
	useShellSlots(() => ({ actions: data.canEdit ? actions : undefined }));
</script>

{#snippet actions()}
	<a class="btn btn-primary" href="/widgets/new">New widget</a>
{/snippet}
```

`getShell()` exposes the back-navigation state (`canGoBack`, `back()`) and the raw slots.

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
useUnsavedGuard(() => draft.dirty);
```

Errors stay on screen until dismissed; other toasts dismiss themselves (paused while hovered).
The toast stack sits in the top layer, so it shows above open modals.

### Modal, FormModal and ScrollArea

`Modal` wraps a native `<dialog class="modal">`. While `busy` is true it can't be dismissed, its
content stays mounted through the exit animation (reset forms in `onclosed`), and focus returns
to the opener.

```svelte
<script lang="ts">
	import { Modal, ScrollArea } from '@finlayjn/svelte-crud-kit';

	let open = $state(false);
	let busy = $state(false);
</script>

<Modal bind:open title="Pick a widget" {busy} class="flex max-w-2xl flex-col">
	<ScrollArea class="-mx-6 mt-4" contentClass="px-6">…a long list…</ScrollArea>
	{#snippet actions()}
		<button type="button" class="btn btn-ghost" onclick={() => (open = false)}>Cancel</button>
	{/snippet}
</Modal>
```

In a height-capped flex column with a `ScrollArea`, give the other children `shrink-0` (the
modal's title and actions already have it).

`FormModal` is a `Modal` holding a form, with Cancel and a submit button. It stays busy (and
can't be dismissed) while `onsubmit` runs; close it from `onsubmit` when that succeeds, and reset
the fields in `onclosed`:

```svelte
<FormModal
	bind:open
	title="New widget"
	submitLabel="Create widget"
	canSubmit={name.trim() !== ''}
	onsubmit={create}
	onclosed={() => (name = '')}
>
	<TextField label="Name" bind:value={name} />
</FormModal>
```

### Panels that fail

`PanelBoundary` keeps one panel's rendering error from taking down the page: the panel is
replaced by a message with Try again, and the error is logged. The message, the retry label, the
error handler and the whole failure UI (`failed` snippet) are overridable.

```svelte
<PanelBoundary label="the activity feed">
	<ActivityFeed />
</PanelBoundary>
```

### After a command

`reportError` logs a failure with its cause and returns what to show the user: the server's own
message for a refused request (a 4xx `error()`), otherwise your fallback. `reload` reruns every
`load` that declared one of the keys with `depends()`, and logs rather than throws if that fails.

```ts
import { getToasts, reload, reportError } from '@finlayjn/svelte-crud-kit/state';

const toasts = getToasts();

async function archive() {
	try {
		await archiveWidget(id); // a remote command
		await reload(`widget:${id}`);
	} catch (error) {
		toasts.error(reportError('widgets', error, 'Could not archive the widget.'));
	}
}
```

### Saving edits

`AutosaveController` saves a single record as one debounced patch; `SaveTracker` saves many keyed
edits (rows of a table), each on its own debounce, and serializes saves per key so a slow
connection can't apply writes out of order. Both retry failures with exponential backoff (not for
4xx errors), report `failed` / `error`, and call `onError` once per failure streak. `flush()`
waits for a save in flight, and `destroy()` sends pending autosave edits rather than dropping them.

`ChangeQueue` is for records several people may edit at once. Each change is keyed (a later
change with the same key replaces it) and value changes carry the value they started from, so
the server can apply them only if nothing changed underneath (compare-and-set) and report a
conflict otherwise. The server answers each change with `saved`, `conflict` (with the stored
value and who changed it), `gone` or `rejected`. A `merge` option can resolve conflicts
automatically (a line-by-line text merge, say); the rest wait in `queue.problems` for
`keepMine` / `useTheirs`, and the `ChangeProblems` component lists them with those choices. In
manual mode everything waits for `flush()`; in autosave, `setValue(change, { immediate: true })`
and `put()` send at once and typing waits for a pause. Have `save` resolve only after the page
shows the saved data, so values don't flash back.

```ts
const queue = new ChangeQueue<Change>({
	mode,
	key: (c) => `${c.kind}:${c.field}`,
	save: async (changes) => {
		const response = await saveChanges({ id, changes });
		await invalidate(`record:${id}`);
		return response;
	}
});
queue.setValue({ kind: 'field', field: 'title', value, baseline: record.title });
```

`RecordEditor` is a `ChangeQueue` for one record edited field by field (manual Save by default):
`editor.draft.name` binds like `EditDraft`'s, `toControl` / `fromControl` convert between stored
values and controls, and each change carries the value it started from, so the server writes
only changed fields (compare them with `sameFieldValue`).

On the server, apply a change only if the stored value still equals its `baseline`, and answer
each change in order. Use `sameFieldValue` on both sides so they agree on what changed. (`/state`
is built by SvelteKit, since it uses runes and `$app/*`: import it from loads, remote functions and
hooks, not from plain Node scripts.)

```ts
import {
	sameFieldValue,
	type ChangeResult,
	type FieldChange
} from '@finlayjn/svelte-crud-kit/state';

function applyChanges(stored: Record<string, unknown>, changes: FieldChange[]) {
	const next = { ...stored };
	const results: ChangeResult[] = changes.map((change) => {
		const current = stored[change.field];
		if (sameFieldValue(change.baseline, current)) {
			next[change.field] = change.value;
			return { status: 'saved' };
		}
		// Someone else changed it; if they set the same value, there's nothing to resolve.
		return sameFieldValue(change.value, current)
			? { status: 'saved', value: current }
			: { status: 'conflict', current, updatedBy: null };
	});
	return { next, results }; // write `next` (only accepted fields differ), return `{ results }`
}
```

A value the record's rules refuse is `{ status: 'rejected', message }`, and a change to a record
that no longer exists is `{ status: 'gone' }`.

For the page around a `ChangeQueue`: `SaveActions` (navbar Save, Discard and status),
`ChangeProblems` (the conflict list), `PendingRemovals` and `UnsavedHint` (manual-mode notes), and
`useUnsavedGuard(() => queue.blocksLeaving)`. Their text is overridable through `labels` (or
`message` / `text` props), and `SaveActions` takes `notify={false}` and `confirmDiscard={false}`
to skip its toasts and its Discard confirmation.

```svelte
{#snippet actions()}
	<SaveActions queue={editor.queue}>
		<button type="button" class="btn btn-outline btn-error btn-sm" onclick={remove}>Delete</button>
	</SaveActions>
{/snippet}

<ChangeProblems queue={editor.queue} label={(change) => LABELS[change.field]} />
```

`SaveGroup` combines several engines into one state for a page:

```ts
import { onDestroy } from 'svelte';
import { SaveGroup, saveIndicatorLabel, useUnsavedGuard } from '@finlayjn/svelte-crud-kit/state';

const group = new SaveGroup();
const unregister = [group.register(editor), group.register(rows)];
onDestroy(() => unregister.forEach((fn) => fn()));

useUnsavedGuard(() => group.dirty);
const label = $derived(saveIndicatorLabel(mode, group)); // "Saving…", "Couldn't save", …
// Manual mode's Save button: await group.flushAll();
```

See the JSDoc for the full API.

## Fields

`/fields` wraps daisyUI controls with a label in one of three placements (`floating`, `top`,
`left`; set an app-wide default with `setFieldDefaults`). Every field is `$bindable` and has an
`onchange` hook for autosave. Choice fields take options as plain strings or `{ value, label }`:

```svelte
<SelectField
	label="Location"
	bind:value={location}
	groups={[{ label: 'North', options: ['Leeds', 'York'] }]}
	allowEmpty
/>
<RadioGroup label="Status" bind:value={status} options={['Open', 'Closed']} inline clearable />
<ReadonlyField label="Owner" value={ownerName} empty="Not set" />
```

Set the house style once, high in the tree; a field's own props still win:

```ts
import { setFieldDefaults } from '@finlayjn/svelte-crud-kit/fields';

setFieldDefaults({
	labelPlacement: 'top',
	select: { allowEmpty: true, placeholder: 'Choose…' },
	radio: { inline: true },
	readonly: { empty: 'Not set' }
});
```

`TokenSelect` is a multi-select as chips with an "add" dropdown, easier on phones than a native
multi-select. Options are `{ value, label }` plus any fields of your own, which a `chip` snippet
can show:

```svelte
<TokenSelect label="Tags" bind:value={tagIds} options={tags}>
	{#snippet chip(tag)}
		<span>{tag.label}</span>
		<span class="text-xs opacity-70">{tag.description}</span>
	{/snippet}
</TokenSelect>
```

## Themes

`/theme` handles light, dark and "follow the system" without a flash of the wrong theme. The
effective theme lives in a cookie, so the server can stamp `<html data-theme>` before paint, and
the browser resolves "system" and follows changes to it. It has no framework imports.

```ts
// src/lib/theme.ts
import { createThemes } from '@finlayjn/svelte-crud-kit/theme';

// daisyUI theme names; defaultPreference is used when the user hasn't chosen (default "system").
export const themes = createThemes({ light: 'light', dark: 'dark' });
```

In `src/app.html`, give the root element a placeholder for the server to fill:
`<html lang="en" data-theme="%theme%">`.

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { themes } from '$lib/theme';

export const handle: Handle = async ({ event, resolve }) => {
	// The user's stored preference ('light' | 'dark' | 'system'), if you keep one.
	const preference = event.locals.user?.theme;
	const { theme, persist } = themes.forRequest(preference, event.cookies.get(themes.cookie));
	if (persist) event.cookies.set(themes.cookie, theme, themes.cookieOptions);
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%theme%', theme)
	});
};
```

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import { themes } from '$lib/theme';

	let { data, children } = $props();
	$effect(() => themes.apply(data.user?.theme));
</script>
```

`THEME_PREFERENCES` lists the choices for a settings control.

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
