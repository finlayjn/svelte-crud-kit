<script lang="ts" generics="Row">
	import { onDestroy, onMount, type Snippet } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { goto, preloadData } from '$app/navigation';
	import type { Column, SortState } from '../list/types.js';
	import RowScope from './RowScope.svelte';

	/**
	 * A snippet-driven table for list pages. Navigable rows: pass `rowHref` and put a `RowLink`
	 * around the label in each row's first cell. The link is what keyboard and screen reader users
	 * follow; a click anywhere else on the row follows it too (Cmd/Ctrl/Shift or middle-click opens a
	 * new tab). Clicks on the row's own controls (links, buttons, inputs) are left alone.
	 */

	interface Props {
		columns: Column[];
		rows: Row[];
		/** Renders the `<td>` cells for one row. */
		row: Snippet<[Row]>;
		/**
		 * A stable key per row (an id). Without it rows are keyed by position, so a re-sorted or
		 * filtered list reuses row DOM (and any row state) for different records.
		 */
		rowKey?: (row: Row) => string | number;
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
		/**
		 * Called with the row when the row's plain area is clicked, for actions that don't navigate
		 * (select, expand). It's a mouse shortcut: give the row a real button for keyboard users.
		 * Ignored when `rowHref` is set.
		 */
		onRowClick?: (row: Row) => void;
		/**
		 * Makes rows navigable: the href for the row's `RowLink`, followed by a click anywhere on the
		 * row. Hovering or focusing a row also preloads its destination (code + `load` data).
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
		rowKey,
		onRowClick,
		rowHref,
		resizable = false,
		resizeStorageKey
	}: Props = $props();

	const sizeClass: Record<NonNullable<Props['size']>, string> = {
		xs: 'table-xs',
		sm: 'table-sm',
		md: 'table-md',
		lg: 'table-lg'
	};
	const clickable = $derived(Boolean(rowHref || onRowClick));

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

	const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"]';

	/** The row a DOM event happened in, if it's one of this table's body rows. */
	function rowOf(tbody: HTMLElement, target: EventTarget | null): Row | undefined {
		const tr = target instanceof Element ? target.closest('tr') : null;
		if (!tr || tr.parentElement !== tbody) return undefined;
		const index = Number(tr.dataset.index);
		return Number.isInteger(index) ? rows[index] : undefined;
	}

	/**
	 * Row clicks, delegated from the body. Clicks on a cell's own controls are left to them, so
	 * cell links keep navigating client-side without a `stopPropagation`.
	 */
	const rowEvents: Attachment<HTMLElement> = (tbody) => {
		let hovered: Element | null = null;

		function onClick(event: MouseEvent) {
			if (event.defaultPrevented || !(event.target instanceof Element)) return;
			if (event.target.closest(INTERACTIVE)) return;
			if (event.type === 'auxclick' && event.button !== 1) return;
			// Don't treat the end of a text selection as a click.
			if (event.type === 'click' && getSelection()?.toString()) return;
			const r = rowOf(tbody, event.target);
			if (r === undefined) return;
			if (!rowHref) {
				if (event.type === 'click') onRowClick?.(r);
				return;
			}
			const link = event.target.closest('tr')?.querySelector<HTMLAnchorElement>('a[data-row-link]');
			const href = link?.href ?? rowHref(r);
			const newTab = event.type === 'auxclick' || event.metaKey || event.ctrlKey || event.shiftKey;
			if (newTab) window.open(href, '_blank', 'noopener');
			else if (link) link.click();
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- the caller's resolved href
			else void goto(href);
		}

		/** Preloads a row's destination the first time the pointer or focus enters it. */
		function onEnter(event: Event) {
			if (!rowHref) return;
			const tr = event.target instanceof Element ? event.target.closest('tr') : null;
			if (!tr || tr === hovered) return;
			hovered = tr;
			const r = rowOf(tbody, tr);
			// Errors (e.g. offline) are ignored; it's an optimization.
			if (r !== undefined) void preloadData(rowHref(r)).catch(() => {});
		}

		tbody.addEventListener('click', onClick);
		tbody.addEventListener('auxclick', onClick);
		tbody.addEventListener('pointerover', onEnter);
		tbody.addEventListener('focusin', onEnter);
		return () => {
			tbody.removeEventListener('click', onClick);
			tbody.removeEventListener('auxclick', onClick);
			tbody.removeEventListener('pointerover', onEnter);
			tbody.removeEventListener('focusin', onEnter);
		};
	};
</script>

<div
	class="rounded-box border-base-300 bg-base-100 relative min-h-0 flex-1 overflow-auto border"
	aria-busy={loading}
>
	<table
		class={['table-pin-rows table', sizeClass[size]]}
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
					{@const dirWord = sort?.dir === 'desc' ? 'descending' : 'ascending'}
					{@const canSort = col.sortable && onsort}
					<th
						class="bg-base-200 {col.align ? alignClass[col.align] : ''} {col.class ?? ''}"
						class:relative={resizable}
						aria-sort={canSort ? (isSorted ? dirWord : 'none') : undefined}
					>
						{#if canSort}
							<button
								type="button"
								class="hover:text-primary inline-flex cursor-pointer items-center gap-1 font-semibold"
								onclick={() => onsort?.(col.key)}
								aria-label={isSorted ? `${col.label}, sorted ${dirWord}` : `Sort by ${col.label}`}
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
		<tbody {@attach rowEvents}>
			{#each rows as r, i (rowKey ? rowKey(r) : i)}
				<tr
					data-index={i}
					class={['hover:bg-base-200/60', clickable && 'cursor-pointer', rowClass?.(r)]}
				>
					<RowScope href={rowHref?.(r)}>{@render row(r)}</RowScope>
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
			<span class="sr-only">Loading</span>
		</div>
	{/if}
</div>
