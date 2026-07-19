<script lang="ts" generics="Row">
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import { preloadData } from '$app/navigation';
	import type { Column, SortState } from '../list/types.js';

	interface Props {
		columns: Column[];
		rows: Row[];
		/** Renders the `<td>` cells for one row. */
		row: Snippet<[Row]>;
		/** Current sort; omit for unsorted tables. */
		sort?: SortState;
		/** Called when a sortable header is clicked. The page updates its sort state and refetches. */
		onsort?: (key: string) => void;
		/** Whether new data is loading (shows an overlay spinner over existing rows). */
		loading?: boolean;
		/** Shown when there are no rows and not loading. */
		empty?: string;
		/** daisyUI size modifier. */
		size?: 'xs' | 'sm' | 'md' | 'lg';
		/** Zebra striping. */
		zebra?: boolean;
		/** Optional extra classes for a row's `<tr>` (e.g. to highlight rows that meet some condition). */
		rowClass?: (row: Row) => string | undefined;
		/** When set, rows become clickable (pointer + keyboard) and invoke this with the row. */
		onRowClick?: (row: Row) => void;
		/**
		 * When set, hovering or focusing a row preloads its destination (code + `load` data) so the
		 * click navigates instantly — the same behaviour SvelteKit gives `data-sveltekit-preload-data`
		 * links. Return the resolved href for the row.
		 */
		rowHref?: (row: Row) => string;
		/**
		 * Enables drag-to-resize column widths (fixed table layout). Cells control their own
		 * truncation/shrinking via their classes (e.g. `truncate`) — this only owns the widths.
		 */
		resizable?: boolean;
		/** When set (and `resizable`), persists column widths to `localStorage` under this key. */
		resizeStorageKey?: string;
	}

	let {
		columns,
		rows,
		row,
		sort,
		onsort,
		loading = false,
		empty = 'Nothing to show.',
		size = 'md',
		zebra = true,
		rowClass,
		onRowClick,
		rowHref,
		resizable = false,
		resizeStorageKey
	}: Props = $props();

	const sizeClass = $derived(`table-${size}`);

	const alignClass: Record<NonNullable<Column['align']>, string> = {
		start: 'text-start',
		center: 'text-center',
		end: 'text-end'
	};

	/* ------------------------------------------------------------------ */
	/*  Column resizing (opt-in)                                          */
	/* ------------------------------------------------------------------ */

	/** Smallest a column may be dragged to, in px. */
	const MIN_WIDTH = 48;
	/** Per-column widths in px, keyed by `column.key`. Overrides the column's initial `width`. */
	let widths = $state<Record<string, number>>({});
	/** The in-progress drag, or `null`. */
	let active: { key: string; startX: number; startWidth: number } | null = null;

	onMount(() => {
		if (!resizable || !resizeStorageKey || typeof localStorage === 'undefined') return;
		try {
			const raw = localStorage.getItem(resizeStorageKey);
			if (raw) widths = JSON.parse(raw) as Record<string, number>;
		} catch {
			// Ignore malformed / unavailable storage.
		}
	});

	function startResize(event: PointerEvent, key: string) {
		const th = (event.currentTarget as HTMLElement).closest('th');
		if (!th) return;
		active = { key, startX: event.clientX, startWidth: widths[key] ?? th.offsetWidth };
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		event.preventDefault();
	}

	function onPointerMove(event: PointerEvent) {
		if (!active) return;
		const next = Math.max(MIN_WIDTH, active.startWidth + (event.clientX - active.startX));
		widths = { ...widths, [active.key]: next };
	}

	function onPointerUp() {
		active = null;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		if (resizeStorageKey && typeof localStorage !== 'undefined') {
			try {
				localStorage.setItem(resizeStorageKey, JSON.stringify(widths));
			} catch {
				// Ignore unavailable storage.
			}
		}
	}

	onDestroy(() => {
		if (typeof window === 'undefined') return;
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
	});

	/** The width to apply to a column's `<col>`, or `null` to leave it auto-sized. */
	function colWidth(col: Column): string | null {
		const w = widths[col.key] ?? col.width;
		return w ? `${w}px` : null;
	}

	/**
	 * Fire `onRowClick` only for clicks on the row's plain area — not on an interactive cell element
	 * (links, buttons, inputs). This lets cells keep their own links (e.g. to a detail page)
	 * navigating client-side without a `stopPropagation` that would force a full page reload.
	 */
	function handleRowClick(event: MouseEvent, r: Row) {
		const target = event.target as HTMLElement | null;
		if (target?.closest('a, button, input, select, textarea, label')) return;
		onRowClick?.(r);
	}

	function handleRowKeydown(event: KeyboardEvent, r: Row) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onRowClick?.(r);
		}
	}

	/** Preload a row's destination on hover/focus. Errors (e.g. offline) are ignored — it's an optimisation. */
	function preloadRow(r: Row) {
		if (rowHref) void preloadData(rowHref(r)).catch(() => {});
	}
</script>

<div class="rounded-box border-base-300 bg-base-100 relative min-h-0 flex-1 overflow-auto border">
	<table
		class="table {sizeClass} table-pin-rows"
		class:table-zebra={zebra}
		class:table-fixed={resizable}
	>
		{#if resizable}
			<colgroup>
				{#each columns as col (col.key)}
					<col style:width={colWidth(col)} />
				{/each}
			</colgroup>
		{/if}
		<thead>
			<tr>
				{#each columns as col (col.key)}
					{@const isSorted = sort?.key === col.key}
					<th
						class="bg-base-200 {col.align ? alignClass[col.align] : ''} {col.class ?? ''}"
						class:relative={resizable}
					>
						{#if col.sortable && onsort}
							<button
								type="button"
								class="hover:text-primary inline-flex cursor-pointer items-center gap-1 font-semibold"
								onclick={() => onsort(col.key)}
								aria-label="Sort by {col.label}"
							>
								{col.label}
								{#if isSorted}
									<span class="text-primary" aria-hidden="true"
										>{sort?.dir === 'asc' ? '▲' : '▼'}</span
									>
								{:else}
									<span class="text-base-content/30" aria-hidden="true">⇅</span>
								{/if}
							</button>
						{:else}
							{col.label}
						{/if}
						{#if resizable}
							<button
								type="button"
								class="hover:bg-primary/40 absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none"
								aria-label="Resize {col.label}"
								tabindex={-1}
								onpointerdown={(e) => startResize(e, col.key)}
							></button>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as r, i (i)}
				<tr
					class="hover:bg-base-200/60 {rowClass?.(r) ?? ''}"
					class:cursor-pointer={onRowClick}
					role={onRowClick ? 'button' : undefined}
					tabindex={onRowClick ? 0 : undefined}
					onclick={onRowClick ? (e) => handleRowClick(e, r) : undefined}
					onmouseenter={rowHref ? () => preloadRow(r) : undefined}
					onfocus={rowHref ? () => preloadRow(r) : undefined}
					onkeydown={onRowClick ? (e) => handleRowKeydown(e, r) : undefined}
				>
					{@render row(r)}
				</tr>
			{:else}
				{#if !loading}
					<tr>
						<td colspan={columns.length} class="py-8 text-center text-base-content/60">
							{empty}
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>

	{#if loading}
		<div class="bg-base-100/50 absolute inset-0 flex items-start justify-center pt-16">
			<span class="loading loading-lg loading-spinner text-primary"></span>
		</div>
	{/if}
</div>
