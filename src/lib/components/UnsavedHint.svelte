<script lang="ts">
	/**
	 * A small "Not saved yet" note beside something added or changed but not saved. Show it in
	 * manual-save mode only: autosave sends the change at once, so the note would only flash.
	 */
	interface Props {
		show?: boolean;
		text?: string;
		class?: string;
	}

	let { show = true, text = 'Not saved yet', class: className }: Props = $props();
</script>

{#if show}<span class={['text-sm font-medium', className]}>{text}</span>{/if}
