<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LabelPlacement } from './fieldConfig.js';

	/**
	 * Wraps a form control (input/select/textarea) with a label using daisyUI's own label patterns:
	 *  - `floating`: `floating-label` (label floats above the control).
	 *  - `top`: `fieldset` + `fieldset-legend` (label stacked above).
	 *  - `left`: the daisyUI inline label — the `variant` border lives on the wrapping `<label>` and a
	 *    `.label` span sits before the (bare) control.
	 *
	 * The control is supplied as a snippet that receives the class string to apply, because `left`
	 * moves the border class off the control and onto the wrapper.
	 */
	interface Props {
		label: string;
		placement?: LabelPlacement;
		/** daisyUI base class for the control (`input` | `select` | `textarea`). */
		variant?: 'input' | 'select' | 'textarea';
		/** Renders the control; receives the class string it should apply. */
		control: Snippet<[string]>;
		/** Extra classes for the wrapping label / fieldset. */
		class?: string;
	}

	let {
		label,
		placement = 'floating',
		variant = 'input',
		control,
		class: className = ''
	}: Props = $props();
</script>

{#if placement === 'left' && variant === 'textarea'}
	<!-- daisyUI has no inline label for textareas, so place a normal `.textarea` beside the label. -->
	<label class="flex w-full items-start gap-3 {className}">
		<span class="label mt-2 shrink-0 text-sm">{label}</span>
		{@render control('textarea w-full')}
	</label>
{:else if placement === 'left'}
	<label class="{variant} w-full {className}">
		<span class="label">{label}</span>
		{@render control('')}
	</label>
{:else if placement === 'top'}
	<fieldset class="fieldset {className}">
		<legend class="fieldset-legend">{label}</legend>
		{@render control(`${variant} w-full`)}
	</fieldset>
{:else}
	<label class="floating-label w-full {className}">
		{@render control(`${variant} w-full`)}
		<span>{label}</span>
	</label>
{/if}
