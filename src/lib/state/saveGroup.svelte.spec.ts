import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { SaveGroup } from './saveGroup.svelte.js';
import { saveIndicatorLabel } from './saveIndicator.js';

function source(initial: { dirty?: boolean; saving?: boolean; failed?: boolean } = {}) {
	const s = $state({ dirty: false, saving: false, failed: false, ...initial });
	return Object.assign(s, { flush: vi.fn(async () => {}) });
}

describe('SaveGroup', () => {
	it('aggregates its sources', () => {
		const group = new SaveGroup();
		const a = source();
		const b = source();
		group.register(a);
		group.register(b);
		expect(group.dirty).toBe(false);
		b.dirty = true;
		expect(group.dirty).toBe(true);
		a.saving = true;
		expect(group.saving).toBe(true);
		b.failed = true;
		expect(
			saveIndicatorLabel('autosave', { ...group, saving: false, dirty: true, failed: true })
		).toBe("Couldn't save");
	});

	it('updates readers when sources come and go', () => {
		const group = new SaveGroup();
		const seen: boolean[] = [];
		const stop = $effect.root(() => {
			$effect(() => {
				seen.push(group.dirty);
			});
		});
		flushSync();
		const unregister = group.register(source({ dirty: true }));
		flushSync();
		unregister();
		flushSync();
		expect(seen).toEqual([false, true, false]);
		stop();
	});

	it('flushes every source', async () => {
		const group = new SaveGroup();
		const a = source();
		const b = source();
		group.register(a);
		const remove = group.register(b);
		remove();
		await group.flushAll();
		expect(a.flush).toHaveBeenCalledTimes(1);
		expect(b.flush).not.toHaveBeenCalled();
	});

	it('nests', () => {
		const outer = new SaveGroup();
		const inner = new SaveGroup();
		outer.register(inner);
		inner.register(source({ saving: true }));
		expect(outer.saving).toBe(true);
	});
});
