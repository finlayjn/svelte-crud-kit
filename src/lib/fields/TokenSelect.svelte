<script
	lang="ts"
	generics="Value extends string | number, Option extends { value: Value; label: string }"
>
	import type { Snippet } from 'svelte';

	/**
	 * A multi-select as chips: a dropdown offers the options not chosen yet, picking one adds a
	 * chip, and each chip has a remove button. Easier on phones than a native multi-select, which
	 * daisyUI doesn't style. The selection is the bound `value` array.
	 */
	interface Props {
		label: string;
		value?: Value[];
		options: readonly Option[];
		/** A chip's content (default: the option's label); the remove button follows it. */
		chip?: Snippet<[Option]>;
		/** The remove button's accessible name (default "Remove {label}"). */
		removeLabel?: (option: Option) => string;
		/** The dropdown's prompt. */
		placeholder?: string;
		/** The dropdown's own label. */
		addLabel?: string;
		/** The prompt once every option is chosen. */
		allAddedLabel?: string;
		/** Shown when nothing is chosen. */
		emptyLabel?: string;
		disabled?: boolean;
		onchange?: () => void;
		class?: string;
	}

	let {
		label,
		value = $bindable([]),
		options,
		chip,
		removeLabel = (option) => `Remove ${option.label}`,
		placeholder = 'Add…',
		addLabel = 'Add',
		allAddedLabel = 'All added',
		emptyLabel = 'None selected.',
		disabled = false,
		onchange,
		class: className = ''
	}: Props = $props();

	const byValue = $derived(new Map(options.map((o) => [o.value, o])));
	const selected = $derived(value.map((v) => byValue.get(v)).filter((o) => o !== undefined));
	const available = $derived(options.filter((o) => !value.includes(o.value)));

	/**
	 * The dropdown works as an "add" button: picking appends the option and resets the select to its
	 * prompt. It isn't bound: once the picked option leaves `available`, a binding can leave the
	 * select showing an option that's gone.
	 */
	function add(event: Event & { currentTarget: HTMLSelectElement }) {
		const picked = event.currentTarget.value;
		event.currentTarget.selectedIndex = 0;
		if (picked === '') return;
		// The select's values are strings; map back to the typed option value.
		const option = options.find((o) => String(o.value) === picked);
		if (!option || value.includes(option.value)) return;
		value = [...value, option.value];
		onchange?.();
	}

	function remove(target: Value) {
		value = value.filter((v) => v !== target);
		onchange?.();
	}
</script>

<fieldset class={['fieldset', className]}>
	<legend class="fieldset-legend">{label}</legend>

	{#if selected.length}
		<div class="flex flex-wrap gap-1.5">
			{#each selected as option (option.value)}
				<span class="badge badge-neutral h-auto items-start gap-1 py-1 leading-tight">
					<span class="flex flex-col gap-0.5">
						{#if chip}{@render chip(option)}{:else}{option.label}{/if}
					</span>
					{#if !disabled}
						<button
							type="button"
							class="cursor-pointer opacity-70 hover:opacity-100"
							aria-label={removeLabel(option)}
							onclick={() => remove(option.value)}
						>
							✕
						</button>
					{/if}
				</span>
			{/each}
		</div>
	{:else}
		<p class="text-base-content/60 text-sm">{emptyLabel}</p>
	{/if}

	{#if !disabled}
		<label class="select w-full">
			<span class="label">{addLabel}</span>
			<select onchange={add} disabled={available.length === 0}>
				<option value="">{available.length === 0 ? allAddedLabel : placeholder}</option>
				{#each available as option (option.value)}
					<option value={String(option.value)}>{option.label}</option>
				{/each}
			</select>
		</label>
	{/if}
</fieldset>
