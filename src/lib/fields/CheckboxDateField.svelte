<script lang="ts">
	import FieldBox from './FieldBox.svelte';
	import type { LabelPlacement } from './fieldConfig.js';

	/**
	 * A "done on a date" control: a checkbox paired with an optional date input, sharing one stored
	 * value — the date string (`YYYY-MM-DD`, empty = not done). The checkbox state is *derived* from
	 * whether a date is present:
	 *  - Ticking the box stamps today's date (in the user's local timezone); it stays editable.
	 *  - Un-ticking the box clears the date.
	 *  - Typing/clearing a date directly keeps the box in sync (checked iff a date is set).
	 *
	 * Backs fields like "Confidentiality agreement signed" / "Training completed", where the box is
	 * the primary control and the exact date is optional.
	 */
	interface Props {
		label: string;
		/** The stored date (`YYYY-MM-DD`), or an empty string when not done. */
		value?: string | null;
		disabled?: boolean;
		labelPlacement?: LabelPlacement;
		/** Called after the value changes (e.g. to schedule a save). */
		onchange?: () => void;
		/** Caption shown next to the checkbox when done / not done. */
		doneLabel?: string;
		notDoneLabel?: string;
		class?: string;
	}

	let {
		label,
		value = $bindable(''),
		disabled = false,
		labelPlacement,
		onchange,
		doneLabel = 'Done',
		notDoneLabel = 'Not done',
		class: className = ''
	}: Props = $props();

	const checked = $derived((value ?? '').trim() !== '');

	/** Today's date as `YYYY-MM-DD` in the user's local timezone (not UTC). */
	function todayLocal(): string {
		const now = new Date();
		const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
		return local.toISOString().slice(0, 10);
	}

	function toggle(event: Event & { currentTarget: HTMLInputElement }) {
		value = event.currentTarget.checked ? todayLocal() : '';
		onchange?.();
	}
</script>

<FieldBox {label} placement={labelPlacement} dense class={className}>
	<label class="label cursor-pointer justify-start gap-2 text-sm">
		<input type="checkbox" class="checkbox checkbox-sm" {disabled} {checked} onchange={toggle} />
		<span class="label-text">{checked ? doneLabel : notDoneLabel}</span>
	</label>
	<input
		type="date"
		class="input input-sm ml-auto w-40"
		aria-label="{label} date"
		{disabled}
		bind:value
		oninput={() => onchange?.()}
	/>
</FieldBox>
