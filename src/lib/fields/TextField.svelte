<script lang="ts">
	import FieldLabel from './FieldLabel.svelte';
	import { getFieldDefaults, type LabelPlacement } from './fieldConfig.js';

	interface Props {
		label: string;
		/** Tolerates `null`/`undefined` (optional fields); the input always writes back a string. */
		value?: string | null;
		type?:
			'text' | 'email' | 'tel' | 'url' | 'password' | 'number' | 'date' | 'time' | 'datetime-local';
		placeholder?: string;
		disabled?: boolean;
		/** Overrides the app-wide label placement for this field. */
		labelPlacement?: LabelPlacement;
		/** Called after the value changes (e.g. to schedule an autosave). */
		onchange?: () => void;
		/** Extra classes for the `<input>`. */
		class?: string;
	}

	let {
		label,
		value = $bindable(''),
		type = 'text',
		placeholder,
		disabled = false,
		labelPlacement,
		onchange,
		class: className = ''
	}: Props = $props();

	const defaults = getFieldDefaults();
	const placement = $derived(labelPlacement ?? defaults.labelPlacement);
	// With a floating label the placeholder text is what shows before the label floats up.
	const resolvedPlaceholder = $derived(
		placeholder ?? (placement === 'floating' ? label : undefined)
	);
</script>

<FieldLabel {label} {placement} variant="input">
	{#snippet control(cls)}
		<input
			{type}
			{disabled}
			class="{cls} {className}"
			placeholder={resolvedPlaceholder}
			bind:value
			oninput={() => onchange?.()}
		/>
	{/snippet}
</FieldLabel>
