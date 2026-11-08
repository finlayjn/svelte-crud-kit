<script lang="ts">
	import { Section } from '$lib/index.js';
	import { TextField, FieldGrid } from '$lib/fields/index.js';
	import { onDestroy } from 'svelte';
	import {
		EditDraft,
		AutosaveController,
		SaveGroup,
		SaveTracker,
		getToasts,
		saveIndicatorLabel,
		useUnsavedGuard
	} from '$lib/state/index.js';

	const toasts = getToasts();

	interface Profile extends Record<string, unknown> {
		name: string;
		email: string;
	}

	// The editable draft, plus the last-saved baseline used for change detection.
	const editor = new EditDraft<Profile>({ name: 'Ada Lovelace', email: 'ada@example.com' });
	let baseline = $state<Profile>({ ...editor.draft });

	const autosave = new AutosaveController<Partial<Profile>, Profile>({
		mode: 'autosave',
		getPatch: () => {
			const patch: Partial<Profile> = {};
			if (editor.draft.name !== baseline.name) patch.name = editor.draft.name;
			if (editor.draft.email !== baseline.email) patch.email = editor.draft.email;
			return Object.keys(patch).length ? patch : null;
		},
		save: async (patch) => {
			// Stand-in for a remote function / API call.
			await new Promise((resolve) => setTimeout(resolve, 600));
			return { ...baseline, ...patch };
		},
		applyResult: (_patch, result) => {
			baseline = result;
			toasts.success('Saved.');
		},
		onError: () => toasts.error('Could not save your changes.'),
		debounceMs: 600
	});

	const status = $derived(saveIndicatorLabel('autosave', autosave));

	// --- Collection autosave (SaveTracker): several rows, each saved on its own debounce. ---
	interface Note {
		id: number;
		text: string;
	}
	let notes = $state<Note[]>([
		{ id: 1, text: 'Call the supplier' },
		{ id: 2, text: 'Confirm the delivery date' },
		{ id: 3, text: 'File the order form' }
	]);
	const tracker = new SaveTracker({
		mode: 'autosave',
		debounceMs: 600,
		onError: () => toasts.error('Could not save a note.')
	});

	function editNote(id: number, text: string) {
		const note = notes.find((n) => n.id === id);
		if (!note) return;
		note.text = text;
		// Schedule a debounced save for just this row; the closure sends its current value.
		tracker.schedule(String(id), async () => {
			await new Promise((resolve) => setTimeout(resolve, 600));
			// A real app would reconcile the server echo here, guarded by `tracker.isPending`.
		});
	}

	const trackerStatus = $derived(saveIndicatorLabel('autosave', tracker));

	// One indicator and one unsaved-changes guard for both engines.
	const group = new SaveGroup();
	group.register(autosave);
	group.register(tracker);
	const pageStatus = $derived(saveIndicatorLabel('autosave', group));
	useUnsavedGuard(() => group.dirty);

	// Leaving the page sends any pending autosave edits instead of dropping them.
	onDestroy(() => {
		autosave.destroy();
		tracker.destroy();
	});
</script>

<div class="p-4">
	<h1 class="mb-3 text-2xl font-bold">Settings</h1>
	<p class="text-base-content/70 mb-3 text-sm" role="status">Whole page: {pageStatus}</p>

	<div class="flex flex-col gap-4">
		<Section title="General">
			<p class="text-base-content/70 text-sm">
				A real route, so the sidebar's "General" link resolves instead of 404ing.
			</p>
		</Section>

		<Section title="Autosave demo">
			<FieldGrid cols={2}>
				<TextField
					label="Name"
					bind:value={editor.draft.name}
					onchange={() => autosave.scheduleFlush()}
				/>
				<TextField
					label="Email"
					type="email"
					bind:value={editor.draft.email}
					onchange={() => autosave.scheduleFlush()}
				/>
			</FieldGrid>
			<div class="text-base-content/60 text-sm">{status}</div>
		</Section>

		<Section title="Collection autosave (SaveTracker)">
			<p class="text-base-content/70 mb-3 text-sm">
				Several independent rows, each debounced and saved on its own key. Saves for a row are
				serialized, so a slow connection can't commit a stale value out of order.
			</p>
			<div class="flex flex-col gap-2">
				{#each notes as note (note.id)}
					<input
						class="input w-full"
						aria-label="Note {note.id}"
						value={note.text}
						oninput={(e) => editNote(note.id, e.currentTarget.value)}
					/>
				{/each}
			</div>
			<div class="text-base-content/60 mt-2 text-sm">{trackerStatus}</div>
		</Section>
	</div>
</div>
