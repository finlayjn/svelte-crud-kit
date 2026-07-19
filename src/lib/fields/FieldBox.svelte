<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getFieldDefaults, type LabelPlacement } from './fieldConfig.js';

	/**
	 * A bordered container for choice controls (checkbox / radio groups), so they read as a labelled
	 * box with the same border cues as the text inputs. daisyUI has no "checkbox group" component,
	 * so this composes a `fieldset` with a legend, following the field label placement:
	 *  - `floating`: the legend floats over the top border (matching a floating-label input).
	 *  - `top`: a `fieldset-legend` sits above the box.
	 *  - `left`: the label sits inline on the left, inside the border.
	 */
	interface Props {
		label: string;
		placement?: LabelPlacement;
		/** Centre a single row of content (a lone checkbox/radio) to an input's height. */
		dense?: boolean;
		children: Snippet;
		class?: string;
	}

	let { label, placement, dense = false, children, class: className = '' }: Props = $props();

	const defaults = getFieldDefaults();
	const resolved = $derived(placement ?? defaults.labelPlacement);
</script>

{#if resolved === 'top'}
	<fieldset
		class="fieldset rounded-field border-base-content/20 bg-base-100 border px-3 pt-1 pb-2 {className}"
	>
		<legend class="fieldset-legend">{label}</legend>
		{@render children()}
	</fieldset>
{:else if resolved === 'left'}
	<fieldset
		class="rounded-field border-base-content/20 bg-base-100 flex w-full items-center gap-3 border px-3 py-2 {className}"
	>
		<span class="label shrink-0 text-sm">{label}</span>
		{@render children()}
	</fieldset>
{:else}
	<fieldset
		class="rounded-field border-base-content/20 bg-base-100 relative border px-3 {dense
			? 'flex items-center py-1.5'
			: 'pt-2.5 pb-2'} {className}"
	>
		<legend
			class="bg-base-100 text-base-content absolute top-0 ml-0.5 -translate-y-1/2 px-1 text-[0.625rem]"
		>
			{label}
		</legend>
		{@render children()}
	</fieldset>
{/if}
