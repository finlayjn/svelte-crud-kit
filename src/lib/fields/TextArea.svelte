<script lang="ts">
	import FieldLabel from './FieldLabel.svelte';
	import { getFieldDefaults, type LabelPlacement } from './fieldConfig.js';

	interface Props {
		label: string;
		value?: string | null;
		placeholder?: string;
		rows?: number;
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		onchange?: () => void;
		class?: string;
	}

	let {
		label,
		value = $bindable(''),
		placeholder,
		rows = 3,
		disabled = false,
		labelPlacement,
		onchange,
		class: className = ''
	}: Props = $props();

	const defaults = getFieldDefaults();
	const placement = $derived(labelPlacement ?? defaults.labelPlacement);
	const resolvedPlaceholder = $derived(
		placeholder ?? (placement === 'floating' ? label : undefined)
	);
</script>

<FieldLabel {label} {placement} variant="textarea">
	{#snippet control(cls)}
		<textarea
			{rows}
			{disabled}
			class="{cls} {className}"
			placeholder={resolvedPlaceholder}
			bind:value
			oninput={() => onchange?.()}
		></textarea>
	{/snippet}
</FieldLabel>
