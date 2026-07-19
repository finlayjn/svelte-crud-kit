<script lang="ts">
	import FieldLabel from './FieldLabel.svelte';
	import { getFieldDefaults, type LabelPlacement } from './fieldConfig.js';

	interface Props {
		label: string;
		/** The value to display. Empty/`null`/`undefined` shows an em dash. */
		value?: string | number | null;
		labelPlacement?: LabelPlacement;
		class?: string;
	}

	let { label, value, labelPlacement, class: className = '' }: Props = $props();

	const defaults = getFieldDefaults();
	const placement = $derived(labelPlacement ?? defaults.labelPlacement);
	const display = $derived(value === null || value === undefined || value === '' ? '—' : value);
</script>

<FieldLabel {label} {placement} variant="input">
	{#snippet control(cls)}
		<div class="{cls} text-base-content/80 flex items-center {className}">{display}</div>
	{/snippet}
</FieldLabel>
