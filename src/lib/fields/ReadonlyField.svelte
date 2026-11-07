<script lang="ts">
	import FieldLabel from './FieldLabel.svelte';
	import { getFieldDefaults, type LabelPlacement } from './fieldConfig.js';

	/** A labeled, read-only value styled like an input, for fields the user may see but not edit. */
	interface Props {
		label: string;
		/** The value to display. Empty/`null`/`undefined` shows `empty`. */
		value?: string | number | null;
		/** Shown, dimmed, when there's no value (default "—"). */
		empty?: string;
		labelPlacement?: LabelPlacement;
		class?: string;
	}

	let { label, value, empty = '—', labelPlacement, class: className = '' }: Props = $props();

	const defaults = getFieldDefaults();
	const placement = $derived(labelPlacement ?? defaults.labelPlacement);
	const missing = $derived(value === null || value === undefined || value === '');
</script>

<FieldLabel {label} {placement} variant="input">
	{#snippet control(cls)}
		<div class="{cls} flex items-center {className}">
			{#if missing}
				<span class="text-base-content/60">{empty}</span>
			{:else}
				<span>{value}</span>
			{/if}
		</div>
	{/snippet}
</FieldLabel>
