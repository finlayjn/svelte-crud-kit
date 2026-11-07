<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getFieldDefaults, type LabelPlacement } from './fieldConfig.js';

	/**
	 * A bordered container for choice controls (checkbox / radio groups), so they read as a labeled
	 * box with the same border cues as the text inputs. daisyUI has no "checkbox group" component,
	 * so this composes a `fieldset` named by its label, following the field label placement:
	 *  - `floating`: the legend floats over the top border (matching a floating-label input).
	 *  - `top`: a `fieldset-legend` sits above the box.
	 *  - `left`: the label sits inline on the left, inside the border.
	 */
	interface Props {
		label: string;
		placement?: LabelPlacement;
		/** Center a single row of content (a lone checkbox/radio) at an input's height. */
		dense?: boolean;
		children: Snippet;
		class?: string;
	}

	let { label, placement, dense = false, children, class: className = '' }: Props = $props();

	const id = $props.id();
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
	<!-- A legend can't sit inline in a flex row, so a span names the group instead. -->
	<fieldset
		aria-labelledby="{id}-label"
		class="rounded-field border-base-content/20 bg-base-100 flex min-h-10 w-full items-center gap-3 border px-3 py-1 {className}"
	>
		<span id="{id}-label" class="text-base-content/70 shrink-0 text-sm">{label}</span>
		{@render children()}
	</fieldset>
{:else}
	<fieldset
		class="rounded-field border-base-content/20 bg-base-100 relative border px-3 {dense
			? 'flex min-h-10 items-center gap-3 py-1'
			: 'pt-3 pb-2'} {className}"
	>
		<legend
			class="bg-base-100 text-base-content absolute top-0 ml-0.5 -translate-y-1/2 px-1 text-xs"
		>
			{label}
		</legend>
		{@render children()}
	</fieldset>
{/if}
