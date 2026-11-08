<script lang="ts">
	import FieldBox from './FieldBox.svelte';
	import {
		getFieldDefaults,
		toFieldOption,
		type FieldOptionInput,
		type LabelPlacement
	} from './fieldConfig.js';

	interface Props {
		label: string;
		value?: string | null;
		/** Options as plain strings (value = label) or `{ value, label }`. */
		options: readonly FieldOptionInput[];
		/** The radios' shared name (defaults to a generated one, unique on the page). */
		name?: string;
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		/** Lay the options out in a row instead of stacked. */
		inline?: boolean;
		/** Allow clearing the selection by clicking the chosen option again. */
		clearable?: boolean;
		onchange?: () => void;
		class?: string;
	}

	const generatedName = $props.id();

	let {
		label,
		value = $bindable(''),
		options,
		name = generatedName,
		disabled = false,
		labelPlacement: labelPlacementProp,
		inline: inlineProp,
		clearable: clearableProp,
		onchange,
		class: className = ''
	}: Props = $props();

	const defaults = getFieldDefaults();
	const labelPlacement = $derived(labelPlacementProp ?? defaults.radio?.labelPlacement);
	const inline = $derived(inlineProp ?? defaults.radio?.inline ?? false);
	const clearable = $derived(clearableProp ?? defaults.radio?.clearable ?? false);
	const items = $derived(options.map(toFieldOption));

	/** With `clearable`, re-clicking the current selection resets it (radios can't be unchecked). */
	function maybeClear(optionValue: string) {
		if (clearable && value === optionValue) {
			value = '';
			onchange?.();
		}
	}
</script>

<FieldBox {label} placement={labelPlacement} class={className}>
	<div class={['flex', inline ? 'flex-row flex-wrap gap-x-5 gap-y-2' : 'flex-col gap-2']}>
		{#each items as option (option.value)}
			<label class="flex cursor-pointer items-center gap-2 text-sm">
				<input
					type="radio"
					class="radio"
					{name}
					value={option.value}
					disabled={disabled || option.disabled}
					bind:group={value}
					onclick={() => maybeClear(option.value)}
					onchange={() => onchange?.()}
				/>
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</FieldBox>
