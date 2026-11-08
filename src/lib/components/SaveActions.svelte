<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getConfirm } from '../state/confirm.svelte.js';
	import { getToasts } from '../state/toast.svelte.js';
	import type { ChangeQueue } from '../state/changeQueue.svelte.js';

	/**
	 * Navbar save controls for a page edited through a `ChangeQueue`. In manual mode: "Unsaved
	 * changes", Discard (after a confirmation) and Save. In autosave: a status that never shifts the
	 * buttons beside it ("Saving…", "All changes saved", a retrying note, or a pointer to the
	 * conflict list). Extra actions (Delete, say) go in `children`, after these.
	 */
	interface Labels {
		save: string;
		saving: string;
		discard: string;
		unsaved: string;
		saved: string;
		retrying: string;
		attention: string;
		/** Toast after a manual save that went through. */
		savedToast: string;
		/** Toast after a manual save that left changes in the conflict list. */
		problemsToast: string;
		discardTitle: string;
		discardMessage: string;
		discardConfirm: string;
	}

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- any change type
		queue: ChangeQueue<any>;
		/** Hide the save controls (the user can't edit); `children` still show. */
		editable?: boolean;
		/** Toast after a manual save (`savedToast`, or `problemsToast` when some weren't saved). */
		notify?: boolean;
		/** Ask before Discard drops the unsaved changes. */
		confirmDiscard?: boolean;
		labels?: Partial<Labels>;
		children?: Snippet;
	}

	let {
		queue,
		editable = true,
		notify = true,
		confirmDiscard = true,
		labels = {},
		children
	}: Props = $props();

	const DEFAULTS: Labels = {
		save: 'Save',
		saving: 'Saving…',
		discard: 'Discard',
		unsaved: 'Unsaved changes',
		saved: 'All changes saved',
		retrying: 'Not saved yet, retrying…',
		attention: 'Needs your attention',
		savedToast: 'Changes saved.',
		problemsToast: 'Some changes need your attention (see the top).',
		discardTitle: 'Discard your unsaved changes?',
		discardMessage: 'Everything you changed since the last save will be lost.',
		discardConfirm: 'Discard changes'
	};
	const text = $derived({ ...DEFAULTS, ...labels });

	const toasts = getToasts();
	const confirm = getConfirm();

	async function save() {
		if (queue.saving || !queue.dirty) return;
		await queue.flush();
		if (!notify) return;
		if (queue.problems.size > 0) toasts.warning(text.problemsToast);
		else if (!queue.failing) toasts.success(text.savedToast);
	}

	async function discard() {
		if (!confirmDiscard) return queue.discardAll();
		const ok = await confirm.ask({
			title: text.discardTitle,
			message: text.discardMessage,
			confirmLabel: text.discardConfirm,
			kind: 'error'
		});
		if (ok) queue.discardAll();
	}
</script>

<div class="flex items-center gap-2">
	{#if editable && queue.mode === 'manual'}
		{#if queue.dirty}
			<span class="hidden text-sm font-medium sm:inline">{text.unsaved}</span>
			<button type="button" class="btn btn-sm" onclick={discard}>{text.discard}</button>
		{/if}
		<button
			type="button"
			class="btn btn-primary btn-sm"
			aria-disabled={!queue.dirty || queue.saving}
			onclick={save}
		>
			{queue.saving ? text.saving : text.save}
		</button>
	{:else if editable}
		<!-- Fixed width so the status never shifts the buttons beside it. -->
		<span class="text-base-content/70 w-40 text-end text-sm" aria-live="polite">
			{#if queue.problems.size > 0}
				{text.attention}
			{:else if queue.failing}
				{text.retrying}
			{:else if queue.saving}
				{text.saving}
			{:else if queue.saved && !queue.dirty}
				{text.saved}
			{/if}
		</span>
	{/if}
	{@render children?.()}
</div>
