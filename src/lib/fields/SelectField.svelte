<script lang="ts">
	import FieldLabel from './FieldLabel.svelte';
	import { getFieldDefaults, type FieldOption, type LabelPlacement } from './fieldConfig.js';

	interface Props {
		label: string;
		value?: string | null;
		options: FieldOption[];
		/** Placeholder option shown first (disabled, selected when value is empty). */
		placeholder?: string;
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		onchange?: () => void;
		class?: string;
	}

	let {
		label,
		value = $bindable(''),
		options,
		placeholder,
		disabled = false,
		labelPlacement,
		onchange,
		class: className = ''
	}: Props = $props();

	const defaults = getFieldDefaults();
	const placement = $derived(labelPlacement ?? defaults.labelPlacement);
</script>

<FieldLabel {label} {placement} variant="select">
	{#snippet control(cls)}
		<select {disabled} class="{cls} {className}" bind:value onchange={() => onchange?.()}>
			{#if placeholder}
				<option value="" disabled>{placeholder}</option>
			{/if}
			{#each options as option (option.value)}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/each}
		</select>
	{/snippet}
</FieldLabel>
