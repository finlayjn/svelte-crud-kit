<script lang="ts" generics="TChange extends object">
	import type { ChangeProblem, ChangeQueue } from '../state/changeQueue.svelte.js';

	/**
	 * Every change a `ChangeQueue` couldn't save, in one list: edits that clash with someone
	 * else's, values the server refused, and changes to records that were removed. Each has its own
	 * choice, plus "all" buttons when there are several conflicts. Renders nothing when empty.
	 */
	interface Labels {
		/** The heading, from the number of problems. */
		title: (count: number) => string;
		/** Who changed it, when the server didn't say. */
		someoneElse: string;
		/** Follows the name of whoever changed it. */
		changedWhileEditing: string;
		theirsHeading: string;
		mineHeading: string;
		useTheirs: string;
		keepMine: string;
		useAllTheirs: string;
		keepAllMine: string;
		/** Under a text conflict (see `isText`). */
		textHint: string;
		/** Follows the server's message for a refused value. */
		rejectedHint: string;
		undo: string;
		/** Acknowledges a change to something removed. */
		dismiss: string;
	}

	interface Props {
		queue: ChangeQueue<TChange>;
		/** What the change is about ("Title", "Notes on row 3"). */
		label: (change: TChange) => string;
		/** A stored or edited value as words (default: the text, or "(empty)"). */
		show?: (change: TChange, value: unknown) => string;
		/** Your side of a conflict (default: `show` of the change's `value`). */
		mine?: (problem: ChangeProblem<TChange>) => string;
		/** Their side of a conflict (default: `show` of the stored value). */
		theirs?: (problem: ChangeProblem<TChange>) => string;
		/** Whether the change is text the user can combine by hand (adds `labels.textHint`). */
		isText?: (change: TChange) => boolean;
		/** The message for a change to something removed meanwhile. */
		goneMessage?: (change: TChange) => string;
		/** Heading level of the title (default 2). */
		level?: 2 | 3 | 4;
		labels?: Partial<Labels>;
	}

	let {
		queue,
		label,
		show = (_change, value) =>
			value === null || value === undefined || value === '' ? '(empty)' : String(value),
		mine,
		theirs,
		isText = () => false,
		goneMessage = () => 'It was removed by someone else, so this change wasn’t saved.',
		level = 2,
		labels = {}
	}: Props = $props();

	const DEFAULTS: Labels = {
		title: (count) =>
			count === 1 ? 'One change needs your attention' : `${count} changes need your attention`,
		someoneElse: 'Someone else',
		changedWhileEditing: 'changed this while you were editing.',
		theirsHeading: 'Theirs (saved)',
		mineHeading: 'Yours (not saved)',
		useTheirs: 'Use theirs',
		keepMine: 'Keep mine',
		useAllTheirs: 'Use all theirs',
		keepAllMine: 'Keep all mine',
		textHint: 'To combine both, edit your text in its box, then choose “Keep mine”.',
		rejectedHint: 'Change the value to try again, or undo your change.',
		undo: 'Undo my change',
		dismiss: 'OK'
	};
	const text = $derived({ ...DEFAULTS, ...labels });

	const titleId = $props.id();
	const problems = $derived([...queue.problems.values()]);
	const conflictCount = $derived(problems.filter((p) => p.kind === 'conflict').length);

	function mineText(problem: ChangeProblem<TChange>): string {
		if (mine) return mine(problem);
		const change = problem.change as { value?: unknown };
		return 'value' in change ? show(problem.change, change.value) : '';
	}

	function theirsText(problem: ChangeProblem<TChange>): string {
		return theirs ? theirs(problem) : show(problem.change, problem.theirs);
	}
</script>

{#if problems.length > 0}
	<section class="card border-warning bg-base-100 border-2" aria-labelledby={titleId}>
		<div class="card-body gap-4">
			<div class="flex flex-wrap items-center justify-between gap-2">
				<svelte:element this={`h${level}`} id={titleId} class="text-lg font-semibold">
					<span aria-hidden="true">⚠</span>
					{text.title(problems.length)}
				</svelte:element>
				{#if conflictCount > 1}
					<div class="flex flex-wrap gap-2">
						<button type="button" class="btn" onclick={() => queue.useAllTheirs()}>
							{text.useAllTheirs}
						</button>
						<button type="button" class="btn btn-warning" onclick={() => queue.keepAllMine()}>
							{text.keepAllMine}
						</button>
					</div>
				{/if}
			</div>

			<ul class="divide-base-300 divide-y">
				{#each problems as problem (problem.key)}
					<li class="flex flex-col gap-2 py-3">
						<span class="font-semibold">{label(problem.change)}</span>
						{#if problem.kind === 'conflict'}
							<p class="text-sm">
								<strong>{problem.by ?? text.someoneElse}</strong>
								{text.changedWhileEditing}
							</p>
							<div class="grid gap-2 sm:grid-cols-2">
								<div class="rounded-field border-base-300 border p-2">
									<div class="text-sm font-medium">{text.theirsHeading}</div>
									<p class="whitespace-pre-wrap">{theirsText(problem)}</p>
								</div>
								<div class="rounded-field border-base-300 border p-2">
									<div class="text-sm font-medium">{text.mineHeading}</div>
									<p class="whitespace-pre-wrap">{mineText(problem)}</p>
								</div>
							</div>
							<div class="flex flex-wrap gap-2">
								<button type="button" class="btn" onclick={() => queue.useTheirs(problem.key)}>
									{text.useTheirs}
								</button>
								<button
									type="button"
									class="btn btn-warning"
									onclick={() => queue.keepMine(problem.key)}
								>
									{text.keepMine}
								</button>
							</div>
							{#if isText(problem.change)}
								<p class="text-base-content/70 text-sm">{text.textHint}</p>
							{/if}
						{:else if problem.kind === 'rejected'}
							<p>{problem.message} {text.rejectedHint}</p>
							<div>
								<button type="button" class="btn" onclick={() => queue.useTheirs(problem.key)}>
									{text.undo}
								</button>
							</div>
						{:else}
							<p>{goneMessage(problem.change)}</p>
							<div>
								<button type="button" class="btn" onclick={() => queue.useTheirs(problem.key)}>
									{text.dismiss}
								</button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}
