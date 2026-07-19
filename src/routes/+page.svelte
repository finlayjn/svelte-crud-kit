<script lang="ts">
	import { DataTable, Pagination, ListHeader, ListPage, Section } from '$lib/index.js';
	import type { Column, SortState, PageSize } from '$lib/list/index.js';
	import { getConfirm, getToasts } from '$lib/state/index.js';

	const confirm = getConfirm();
	const toasts = getToasts();

	async function tryDelete() {
		const ok = await confirm.ask({
			title: 'Delete this record?',
			message: 'This is a demo — nothing is actually deleted.',
			confirmLabel: 'Delete',
			kind: 'error',
			checkbox: { label: 'Also delete related activity' }
		});
		if (ok)
			toasts.success(confirm.checkboxChecked ? 'Record and activity deleted.' : 'Record deleted.');
		else toasts.info('Cancelled.');
	}

	interface Person {
		id: number;
		name: string;
		email: string;
		role: 'Admin' | 'Editor' | 'Viewer';
		signups: number;
	}

	const ROLES = ['Admin', 'Editor', 'Viewer'] as const;
	const all: Person[] = Array.from({ length: 137 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		email: `person${i + 1}@example.com`,
		role: ROLES[i % 3],
		signups: (i * 37) % 100
	}));

	const columns: Column[] = [
		{ key: 'name', label: 'Name', sortable: true, width: 180 },
		{ key: 'email', label: 'Email', width: 240 },
		{ key: 'role', label: 'Role', sortable: true, width: 120 },
		{ key: 'signups', label: 'Signups', sortable: true, align: 'end', width: 120 }
	];

	let sort = $state<SortState>({ key: 'name', dir: 'asc' });
	let page = $state(1);
	let pageSize = $state<PageSize>(25);

	const sorted = $derived(
		[...all].sort((a, b) => {
			const dir = sort.dir === 'asc' ? 1 : -1;
			const key = sort.key as keyof Person;
			return a[key] < b[key] ? -dir : a[key] > b[key] ? dir : 0;
		})
	);
	const rows = $derived(sorted.slice((page - 1) * pageSize, page * pageSize));

	function toggleSort(key: string) {
		sort =
			sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
		page = 1;
	}
</script>

<div class="h-full">
	<ListPage>
		<h1 class="mb-3 text-2xl font-bold">svelte-crud-kit — component showcase</h1>

		<div class="mb-3 flex flex-wrap gap-2">
			<button type="button" class="btn btn-error btn-sm" onclick={tryDelete}>
				Confirm dialog + toast demo
			</button>
			<button type="button" class="btn btn-sm" onclick={() => toasts.warning('Heads up!')}>
				Warning toast
			</button>
		</div>

		<ListHeader
			description="Demo dataset rendered entirely from the extracted primitives (local state, no backend)."
			stats={[
				{ label: 'People', value: all.length },
				{ label: 'Admins', value: all.filter((p) => p.role === 'Admin').length },
				{
					label: 'Avg signups',
					value: Math.round(all.reduce((n, p) => n + p.signups, 0) / all.length)
				}
			]}
		/>

		<DataTable
			{columns}
			{rows}
			{sort}
			onsort={toggleSort}
			resizable
			resizeStorageKey="crud-kit-people"
		>
			{#snippet row(p: Person)}
				<td class="truncate font-medium">{p.name}</td>
				<td class="text-base-content/70 truncate">{p.email}</td>
				<td>{p.role}</td>
				<td class="text-end tabular-nums">{p.signups}</td>
			{/snippet}
		</DataTable>

		<Pagination
			{page}
			{pageSize}
			total={all.length}
			onpage={(p) => (page = p)}
			onpageSize={(s) => {
				pageSize = s;
				page = 1;
			}}
		/>

		<div class="mt-4">
			<Section title="Section / card primitive">
				<p class="text-base-content/70 text-sm">
					A titled daisyUI card, collapsible on mobile and always open from `sm` up.
				</p>
			</Section>
		</div>
	</ListPage>
</div>
