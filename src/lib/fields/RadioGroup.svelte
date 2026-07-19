<script lang="ts">
	import FieldBox from './FieldBox.svelte';
	import type { FieldOption, LabelPlacement } from './fieldConfig.js';

	interface Props {
		label: string;
		value?: string | null;
		options: FieldOption[];
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		/** Lay the options out in a row instead of stacked. */
		inline?: boolean;
		/** Allow clearing the selection by clicking the chosen option again. */
		clearable?: boolean;
		onchange?: () => void;
		class?: string;
	}

	let {
		label,
		value = $bindable(''),
		options,
		disabled = false,
		labelPlacement,
		inline = false,
		clearable = false,
		onchange,
		class: className = ''
	}: Props = $props();

	// A stable name shared by the group's inputs (unique across SSR + hydration).
	const name = $props.id();

	/** With `clearable`, re-clicking the current selection resets it (radios can't be unchecked). */
	function maybeClear(optionValue: string) {
		if (clearable && value === optionValue) {
			value = '';
			onchange?.();
		}
	}
</script>

<FieldBox {label} placement={labelPlacement} class={className}>
	<div class="flex {inline ? 'flex-row flex-wrap gap-x-5 gap-y-1.5' : 'flex-col gap-2'}">
		{#each options as option (option.value)}
			<label class="label cursor-pointer justify-start gap-2 text-sm">
				<input
					type="radio"
					class="radio radio-sm"
					{name}
					value={option.value}
					disabled={disabled || option.disabled}
					bind:group={value}
					onclick={() => maybeClear(option.value)}
					onchange={() => onchange?.()}
				/>
				<span class="label-text">{option.label}</span>
			</label>
		{/each}
	</div>
</FieldBox>
