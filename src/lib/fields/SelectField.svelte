<script lang="ts">
	import FieldLabel from './FieldLabel.svelte';
	import {
		getFieldDefaults,
		toFieldOption,
		type FieldOptionGroup,
		type FieldOptionInput,
		type LabelPlacement
	} from './fieldConfig.js';

	interface Props {
		label: string;
		value?: string | null;
		/** Options as plain strings (value = label) or `{ value, label }`. */
		options?: readonly FieldOptionInput[];
		/** Options rendered as `<optgroup>`s, after any ungrouped `options`. */
		groups?: readonly FieldOptionGroup[];
		/**
		 * Text for the empty option. Without `allowEmpty` it's a disabled prompt shown while the value
		 * is empty; with it, a selectable "no value" choice (default "—").
		 */
		placeholder?: string;
		/** Offer a selectable empty option that clears an optional value back to `''`. */
		allowEmpty?: boolean;
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		onchange?: () => void;
		class?: string;
	}

	let {
		label,
		value = $bindable(''),
		options = [],
		groups = [],
		placeholder,
		allowEmpty = false,
		disabled = false,
		labelPlacement,
		onchange,
		class: className = ''
	}: Props = $props();

	const defaults = getFieldDefaults();
	const placement = $derived(labelPlacement ?? defaults.labelPlacement);
	const items = $derived(options.map(toFieldOption));
	const groupItems = $derived(
		groups.map((group) => ({ label: group.label, options: group.options.map(toFieldOption) }))
	);
</script>

<FieldLabel {label} {placement} variant="select">
	{#snippet control(cls)}
		<select {disabled} class="{cls} {className}" bind:value onchange={() => onchange?.()}>
			{#if allowEmpty}
				<option value="">{placeholder ?? '—'}</option>
			{:else if placeholder}
				<option value="" disabled>{placeholder}</option>
			{/if}
			{#each items as option (option.value)}
				<option value={option.value} disabled={option.disabled}>{option.label}</option>
			{/each}
			{#each groupItems as group (group.label)}
				<optgroup label={group.label}>
					{#each group.options as option (option.value)}
						<option value={option.value} disabled={option.disabled}>{option.label}</option>
					{/each}
				</optgroup>
			{/each}
		</select>
	{/snippet}
</FieldLabel>
