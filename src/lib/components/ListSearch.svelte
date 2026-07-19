<script lang="ts">
	/**
	 * Debounced search box for list pages (daisyUI "search input with icon"), designed to pair with
	 * {@link import('../state/listUrl.svelte.js').createListUrl}'s `search` / `setSearch`.
	 *
	 * It's intentionally uncontrolled: it seeds its text once from `initial` and is the source of
	 * truth while the user types, calling `onsearch` (debounced) to push the term into the URL. Key it
	 * on the page's filter identity (`{#key}`) so it re-seeds (e.g. clears) when the filter context
	 * changes.
	 */
	import { untrack, onDestroy } from 'svelte';

	interface Props {
		/** The committed term to seed the box with (read once on mount). */
		initial?: string;
		/** Called with the trimmed term after the debounce, and immediately when cleared. */
		onsearch: (term: string) => void;
		placeholder?: string;
		/** Debounce delay in milliseconds. */
		delay?: number;
		class?: string;
	}

	let {
		initial = '',
		onsearch,
		placeholder = 'Search',
		delay = 250,
		class: className = 'input input-sm w-full'
	}: Props = $props();

	// Seeded once; the box owns the term while typing and the page re-mounts it (via `{#key}`) to
	// re-seed when the filter context changes. `untrack` makes the one-time read explicit.
	let term = $state(untrack(() => initial));
	let timer: ReturnType<typeof setTimeout> | undefined;

	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		term = event.currentTarget.value;
		clearTimeout(timer);
		const value = term;
		timer = setTimeout(() => onsearch(value.trim()), delay);
	}

	function clear() {
		clearTimeout(timer);
		term = '';
		onsearch('');
	}

	// The box is remounted (via `{#key}`) when the filter context changes, so cancel any pending
	// debounced search on teardown — otherwise a stale term could fire after the view has moved on.
	onDestroy(() => clearTimeout(timer));
</script>

<label class={className}>
	<svg
		class="h-[1em] opacity-50"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		aria-hidden="true"
	>
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.3-4.3" />
	</svg>
	<input type="search" class="grow" {placeholder} value={term} oninput={handleInput} />
	{#if term}
		<button
			type="button"
			class="opacity-50 hover:opacity-100"
			onclick={clear}
			aria-label="Clear search"
		>
			<svg
				class="h-[1em]"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				aria-hidden="true"
			>
				<path d="M18 6 6 18M6 6l12 12" />
			</svg>
		</button>
	{/if}
</label>
