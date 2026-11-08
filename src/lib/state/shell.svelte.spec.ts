import { describe, expect, it, vi } from 'vitest';
import type { Snippet } from 'svelte';

vi.mock('$app/state', () => ({ page: { data: {}, url: new URL('http://localhost/') } }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const { ShellState } = await import('./shell.svelte.js');

const snippet = (() => {}) as unknown as Snippet;
const other = (() => {}) as unknown as Snippet;

describe('ShellState navbar slots', () => {
	it('restores a layout slot cleared by a route change', () => {
		const shell = new ShellState();
		const layout = {};
		shell.claimSlot('search', snippet, layout);
		shell.clearSlots();
		expect(shell.search).toBeUndefined();
		shell.restoreSlots();
		expect(shell.search).toBe(snippet);
	});

	it('does not restore a slot whose owner unmounted', () => {
		const shell = new ShellState();
		const page = {};
		shell.claimSlot('actions', snippet, page);
		shell.clearSlots();
		shell.releaseSlot('actions', page);
		shell.restoreSlots();
		expect(shell.actions).toBeUndefined();
	});

	it('lets the new page keep a slot it claimed', () => {
		const shell = new ShellState();
		const layout = {};
		shell.claimSlot('actions', snippet, layout);
		shell.clearSlots();
		shell.claimSlot('actions', other, {});
		shell.restoreSlots();
		expect(shell.actions).toBe(other);
		// The layout's parked claim is gone, so a later restore doesn't bring it back either.
		shell.releaseSlot('actions', layout);
		shell.restoreSlots();
		expect(shell.actions).toBe(other);
	});
});
