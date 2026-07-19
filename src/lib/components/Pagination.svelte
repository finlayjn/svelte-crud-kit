<script lang="ts">
	import { PAGE_SIZES, type PageSize } from '../list/constants.js';

	interface Props {
		/** 1-based current page. */
		page: number;
		pageSize: PageSize;
		/** Total matching rows (from the filter-keyed stats query, not the rows query). */
		total: number;
		onpage: (page: number) => void;
		onpageSize: (size: PageSize) => void;
		/** Selectable page sizes for the per-page control (defaults to {@link PAGE_SIZES}). */
		pageSizes?: readonly number[];
		/** Singular noun for the row-count label (default `'row'`). */
		noun?: string;
		/** Plural noun for the row-count label (default `'rows'`). */
		nounPlural?: string;
	}

	let {
		page,
		pageSize,
		total,
		onpage,
		onpageSize,
		pageSizes = PAGE_SIZES,
		noun = 'row',
		nounPlural = 'rows'
	}: Props = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(total / pageSize)));
	const from = $derived(total === 0 ? 0 : (page - 1) * pageSize + 1);
	const to = $derived(Math.min(page * pageSize, total));

	/** A page button, or a gap placeholder. Each carries a unique `key` for the keyed `{#each}`. */
	type PageItem = { key: string; value: number } | { key: string; value: null };

	/** Total slots shown once there are more pages than this; below it, every page is shown. */
	const MAX_VISIBLE = 7;
	/** Pages kept either side of the current one in the "both ellipses" (middle) layout. */
	const SIBLINGS = 1;

	/**
	 * A fixed-width page strip. With `MAX_VISIBLE` or fewer pages, every page is shown; beyond that,
	 * the strip is always exactly `MAX_VISIBLE` slots (first/last anchors, the current page and its
	 * siblings, and ellipses) so the control doesn't jump around as you page through.
	 *
	 * A gap that would hide only a single page is replaced by that page number instead — an ellipsis
	 * standing in for one page wastes the same space while hiding a click target. Doing so keeps the
	 * slot count constant (one gap → one number).
	 *
	 * Gaps are distinct items with unique keys — a middle page yields two gaps, and reusing `'…'` as
	 * the key would collide and break the keyed each (a past cause of mid-range pages not navigating).
	 */
	const pages = $derived.by(() => {
		const slots: (number | null)[] = [];

		if (totalPages <= MAX_VISIBLE) {
			for (let p = 1; p <= totalPages; p++) slots.push(p);
		} else {
			const leftSibling = Math.max(page - SIBLINGS, 1);
			const rightSibling = Math.min(page + SIBLINGS, totalPages);
			const showLeftGap = leftSibling > 2;
			const showRightGap = rightSibling < totalPages - 1;
			const edgeCount = MAX_VISIBLE - 2; // numbers shown on the near side when only one gap exists

			if (!showLeftGap && showRightGap) {
				// Near the start: 1 … edgeCount, gap, last.
				for (let p = 1; p <= edgeCount; p++) slots.push(p);
				slots.push(null, totalPages);
			} else if (showLeftGap && !showRightGap) {
				// Near the end: first, gap, last-(edgeCount-1) … last.
				slots.push(1, null);
				for (let p = totalPages - edgeCount + 1; p <= totalPages; p++) slots.push(p);
			} else {
				// Middle: first, gap, current±siblings, gap, last.
				slots.push(1, null);
				for (let p = leftSibling; p <= rightSibling; p++) slots.push(p);
				slots.push(null, totalPages);
			}

			// Collapse any single-page gap into the page it hides (keeps the slot count constant).
			for (let i = 0; i < slots.length; i++) {
				const before = slots[i - 1];
				const after = slots[i + 1];
				if (
					slots[i] === null &&
					typeof before === 'number' &&
					typeof after === 'number' &&
					after - before === 2
				) {
					slots[i] = before + 1;
				}
			}
		}

		let gap = 0;
		return slots.map<PageItem>((value) =>
			value === null ? { key: `gap-${gap++}`, value: null } : { key: `page-${value}`, value }
		);
	});
</script>

<!--
	Layout: on `sm`+ a 3-column grid keeps the pagination centred regardless of how wide the row-count
	text or per-page select are. On mobile the pagination sits on its own row up top, with the row count
	and the per-page control paired beneath it (a `sm:contents` wrapper lets those two collapse into
	their own grid cells at `sm`).
-->
<div class="flex flex-col gap-2 py-2 sm:grid sm:grid-cols-3 sm:items-center">
	<div class="order-first flex justify-center sm:order-none sm:col-start-2 sm:row-start-1">
		{#if totalPages > 1}
			<div class="join">
				<button
					type="button"
					class="btn join-item btn-sm"
					disabled={page <= 1}
					onclick={() => onpage(page - 1)}
					aria-label="Previous page">«</button
				>
				{#each pages as item (item.key)}
					{#if item.value === null}
						<button type="button" class="btn btn-disabled join-item btn-sm">…</button>
					{:else}
						<button
							type="button"
							class="btn join-item btn-sm"
							class:btn-primary={item.value === page}
							aria-current={item.value === page ? 'page' : undefined}
							onclick={() => onpage(item.value)}>{item.value}</button
						>
					{/if}
				{/each}
				<button
					type="button"
					class="btn join-item btn-sm"
					disabled={page >= totalPages}
					onclick={() => onpage(page + 1)}
					aria-label="Next page">»</button
				>
			</div>
		{/if}
	</div>

	<div class="flex items-center justify-between gap-3 sm:contents">
		<div class="text-base-content/70 text-sm sm:col-start-1 sm:row-start-1 sm:justify-self-start">
			{from}–{to} of {total}
			{total === 1 ? noun : nounPlural}
		</div>

		<label class="flex items-center gap-1 sm:col-start-3 sm:row-start-1 sm:justify-self-end">
			<select
				class="select select-xs w-20"
				value={pageSize}
				onchange={(e) => onpageSize(Number(e.currentTarget.value))}
			>
				{#each pageSizes as size (size)}
					<option value={size}>{size}</option>
				{/each}
			</select>
			<span>per page</span>
		</label>
	</div>
</div>
