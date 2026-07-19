import { beforeNavigate, goto } from '$app/navigation';
import { getConfirm } from './confirm.svelte.js';

// Shared across every guard mounted on the current page. When several components each register a
// guard, one confirm covers the whole page: `prompting` stops the dialogs stacking, and `bypassOnce`
// lets the single re-issued navigation pass every guard once the user has chosen to discard.
let bypassOnce = false;
let prompting = false;

/**
 * Warns before leaving a page with unsaved edits.
 *
 * Manual-save (and autosave-with-pending) detail pages keep changes in a local draft until they're
 * flushed. Without a guard, an in-app navigation or a tab close silently discards them.
 *
 * This wraps {@link beforeNavigate}:
 *  - For an in-app navigation, it cancels, asks via the app's confirm dialog, and — if the user
 *    chooses to discard — re-issues the same navigation (now allowed through by a one-shot bypass).
 *  - For a real unload (`willUnload`, e.g. closing the tab or a hard reload), cancelling triggers the
 *    browser's native "Leave site?" prompt, which is the only thing browsers allow there.
 *
 * Requires a confirm store in context (call `createConfirm()` and mount `<ConfirmModal />` in the
 * root layout). Must be called during component initialisation (like other lifecycle hooks); the
 * guard is torn down automatically when the component unmounts. Several guards may be active on the
 * same page (e.g. a profile editor and a settings form); they share one confirm dialog, and a single
 * "Discard" lets the re-issued navigation pass every guard.
 *
 * @param isDirty A getter returning whether there are unsaved changes right now.
 */
export function useUnsavedGuard(isDirty: () => boolean): void {
	const confirm = getConfirm();

	beforeNavigate((navigation) => {
		// A discard was already confirmed for this navigation; let it through every guard.
		if (bypassOnce) return;
		if (!isDirty()) return;

		// A real unload (tab close / hard reload): the browser only permits its own native prompt.
		if (navigation.willUnload) {
			navigation.cancel();
			return;
		}

		const target = navigation.to?.url;
		if (!target) return;

		// In-app navigation: cancel, ask, and re-issue the navigation if the user discards.
		navigation.cancel();

		// Another guard on the same page is already prompting for this navigation — don't stack dialogs.
		if (prompting) return;
		prompting = true;

		void (async () => {
			const ok = await confirm.ask({
				title: 'Discard unsaved changes?',
				message: 'You have unsaved changes on this page. If you leave now, they will be lost.',
				confirmLabel: 'Discard changes',
				cancelLabel: 'Stay on page',
				kind: 'error'
			});
			prompting = false;
			if (!ok) return;
			bypassOnce = true;
			try {
				// `target` is the URL SvelteKit was already navigating to, not a literal route, so
				// `resolve()` can't type it; re-issuing the same navigation is intentional here.
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				await goto(target, { replaceState: navigation.type === 'popstate' });
			} finally {
				bypassOnce = false;
			}
		})();
	});
}
