<script lang="ts">
	import FieldBox from './FieldBox.svelte';
	import type { FieldOption, LabelPlacement } from './fieldConfig.js';

	/**
	 * A multi-select backed by an array of strings, rendered as a bordered `fieldset` of checkboxes.
	 * daisyUI has no native "checkbox group", so this composes `FieldBox` + `checkbox` into one.
	 */
	interface Props {
		label: string;
		/** Selected option values. */
		value?: string[];
		options: FieldOption[];
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
</script>

<FieldBox {label} placement={labelPlacement} class={className}>
	<div class="flex flex-wrap gap-x-5 gap-y-1.5">
		{#each options as option (option.value)}
			<label class="label cursor-pointer justify-start gap-2 text-sm">
				<input
					type="checkbox"
					class="checkbox checkbox-sm"
					disabled={disabled || option.disabled}
					value={option.value}
					bind:group={value}
					onchange={() => onchange?.()}
				/>
				<span class="label-text">{option.label}</span>
			</label>
		{/each}
	</div>
</FieldBox>
