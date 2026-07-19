<script lang="ts">
	import { Section } from '$lib/index.js';
	import {
		FieldGrid,
		TextField,
		TextArea,
		SelectField,
		CheckboxField,
		CheckboxDateField,
		CheckboxGroup,
		RadioGroup,
		ReadonlyField,
		type LabelPlacement,
		type FieldOption
	} from '$lib/fields/index.js';

	// Shared state so edits mirror across the three placement columns (also shows reactivity).
	let name = $state('Ada Lovelace');
	let email = $state('ada@example.com');
	let amount = $state('42');
	let bio = $state('Countess of Lovelace.');
	let role = $state('editor');
	let colors = $state<string[]>(['red']);
	let choice = $state('b');
	let active = $state(true);
	let trainedOn = $state('');

	const roleOptions: FieldOption[] = [
		{ value: 'admin', label: 'Admin' },
		{ value: 'editor', label: 'Editor' },
		{ value: 'viewer', label: 'Viewer' }
	];
	const colorOptions: FieldOption[] = [
		{ value: 'red', label: 'Red' },
		{ value: 'green', label: 'Green' },
		{ value: 'blue', label: 'Blue' }
	];
	const choiceOptions: FieldOption[] = [
		{ value: 'a', label: 'Option A' },
		{ value: 'b', label: 'Option B' },
		{ value: 'c', label: 'Option C (disabled)', disabled: true }
	];

	const placements: { id: LabelPlacement; label: string }[] = [
		{ id: 'floating', label: 'Floating' },
		{ id: 'top', label: 'Top' },
		{ id: 'left', label: 'Left' }
	];
</script>

<div class="p-4">
	<h1 class="mb-1 text-2xl font-bold">Fields kit</h1>
	<p class="text-base-content/70 mb-4 text-sm">
		Every field across all three label placements. State is shared between the columns, so editing
		one updates the others.
	</p>

	<div class="grid gap-4 lg:grid-cols-3">
		{#each placements as placement (placement.id)}
			<Section title="{placement.label} labels" open>
				<FieldGrid cols={1}>
					<TextField label="Name" bind:value={name} labelPlacement={placement.id} />
					<TextField label="Email" type="email" bind:value={email} labelPlacement={placement.id} />
					<TextField
						label="Amount"
						type="number"
						bind:value={amount}
						labelPlacement={placement.id}
					/>
					<TextField label="Disabled" bind:value={name} disabled labelPlacement={placement.id} />
					<SelectField
						label="Role"
						bind:value={role}
						options={roleOptions}
						labelPlacement={placement.id}
					/>
					<SelectField
						label="Role"
						bind:value={role}
						options={roleOptions}
						placeholder="Choose a role…"
						labelPlacement={placement.id}
					/>
					<TextArea label="Bio" bind:value={bio} labelPlacement={placement.id} />
					<ReadonlyField label="Read-only" value={email} labelPlacement={placement.id} />
				</FieldGrid>

				<div class="mt-4 flex flex-col gap-3">
					<CheckboxField label="Active" bind:checked={active} labelPlacement={placement.id} />
					<CheckboxDateField
						label="Training completed"
						bind:value={trainedOn}
						labelPlacement={placement.id}
					/>
					<CheckboxGroup
						label="Colors"
						bind:value={colors}
						options={colorOptions}
						labelPlacement={placement.id}
					/>
					<RadioGroup
						label="Choice"
						bind:value={choice}
						options={choiceOptions}
						labelPlacement={placement.id}
					/>
					<RadioGroup
						label="Choice (inline, clearable)"
						bind:value={choice}
						options={choiceOptions}
						inline
						clearable
						labelPlacement={placement.id}
					/>
				</div>
			</Section>
		{/each}
	</div>
</div>
