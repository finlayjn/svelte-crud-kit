<script lang="ts">
	/**
	 * Things marked for removal but not saved yet, each with Undo. Show it in manual-save mode only:
	 * in autosave a removal is sent at once, so the notice would only flash.
	 */
	interface PendingRemoval {
		key: string;
		/** What will be removed ("Jane Doe", "the entry from 01/02/2026"). */
		label: string;
		undo: () => void;
	}

	interface Props {
		items: readonly PendingRemoval[];
		/** Text before the label. */
		message?: string;
		undoLabel?: string;
	}

	let { items, message = 'Will be removed when you save:', undoLabel = 'Undo' }: Props = $props();
</script>

{#each items as item (item.key)}
	<p class="flex flex-wrap items-center gap-2 text-sm">
		<span>{message} <strong>{item.label}</strong></span>
		<button type="button" class="btn btn-sm" onclick={item.undo}>{undoLabel}</button>
	</p>
{/each}
