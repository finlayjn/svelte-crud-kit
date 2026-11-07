<script lang="ts">
	/**
	 * Debounced search box for list pages (daisyUI "search input with icon"), designed to pair with
	 * {@link import('../state/listUrl.svelte.js').createListUrl}'s `search` / `setSearch`.
	 *
	 * The box shows `initial` and follows it when it changes (a filter link, Back), while typing
	 * calls `onsearch` (debounced) to push the term into the URL. When the URL catches up with a term
	 * the box sent, anything typed since is kept.
	 */
	import { onDestroy } from 'svelte';

	interface Props {
		/** The committed term (usually from the URL). The box resets to it when it changes. */
		initial?: string;
		/** Called with the trimmed term after the debounce, and immediately when cleared. */
		onsearch: (term: string) => void;
		/** Placeholder, also the input's accessible name. */
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
		class: className = 'input w-full'
	}: Props = $props();

	let input: HTMLInputElement | undefined;
	/** The last term this box sent (plain: only compared, never rendered). */
	let sent: string | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;

	// Writable derived: follows `initial`, overwritten while typing. The URL catching up with a term
	// this box sent keeps the box's current text instead of snapping back.
	let term = $derived.by(() => (initial === sent && input ? input.value : initial));

	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		term = event.currentTarget.value;
		clearTimeout(timer);
		const value = term.trim();
		timer = setTimeout(() => {
			sent = value;
			onsearch(value);
		}, delay);
	}

	function clear() {
		clearTimeout(timer);
		term = '';
		sent = '';
		onsearch('');
		input?.focus();
	}

	// Cancel a pending debounced search on teardown, so a stale term can't fire after the view has
	// moved on.
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
	<input
		bind:this={input}
		type="search"
		class="grow"
		{placeholder}
		aria-label={placeholder}
		value={term}
		oninput={handleInput}
	/>
	{#if term}
		<button
			type="button"
			class="opacity-60 hover:opacity-100"
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
