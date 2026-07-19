<script lang="ts">
	import FieldBox from './FieldBox.svelte';
	import type { LabelPlacement } from './fieldConfig.js';

	interface Props {
		label: string;
		checked?: boolean;
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		/** Called after the checked state changes (e.g. to schedule an autosave). */
		onchange?: () => void;
		/** Text shown next to the checkbox (defaults to the label). */
		caption?: string;
		class?: string;
	}

	let {
		label,
		checked = $bindable(false),
		disabled = false,
		labelPlacement,
		onchange,
		caption,
		class: className = ''
	}: Props = $props();
</script>

<FieldBox {label} placement={labelPlacement} dense class={className}>
	<label class="label cursor-pointer justify-start gap-2 text-sm">
		<input
			type="checkbox"
			class="checkbox checkbox-sm"
			{disabled}
			bind:checked
			onchange={() => onchange?.()}
		/>
		<span class="label-text">{caption ?? label}</span>
	</label>
</FieldBox>
