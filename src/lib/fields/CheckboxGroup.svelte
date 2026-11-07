<script lang="ts">
	import FieldBox from './FieldBox.svelte';
	import { toFieldOption, type FieldOptionInput, type LabelPlacement } from './fieldConfig.js';

	/**
	 * A multi-select backed by an array of strings, rendered as a bordered `fieldset` of checkboxes.
	 * daisyUI has no native "checkbox group", so this composes `FieldBox` + `checkbox` into one.
	 */
	interface Props {
		label: string;
		/** Selected option values. */
		value?: string[];
		/** Options as plain strings (value = label) or `{ value, label }`. */
		options: readonly FieldOptionInput[];
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		onchange?: () => void;
		class?: string;
	}

	let {
		label,
		value = $bindable([]),
		options,
		disabled = false,
		labelPlacement,
		onchange,
		class: className = ''
	}: Props = $props();

	const items = $derived(options.map(toFieldOption));
</script>

<FieldBox {label} placement={labelPlacement} class={className}>
	<div class="flex flex-wrap gap-x-5 gap-y-2">
		{#each items as option (option.value)}
			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox"
					disabled={disabled || option.disabled}
					value={option.value}
					bind:group={value}
					onchange={() => onchange?.()}
				/>
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</FieldBox>
