import { invalidate } from '$app/navigation';

/**
 * Reruns every `load` that declared any of `keys` with `depends()`, in one request, after a
 * command changed their data. A failure is logged rather than thrown: the command before it
 * already succeeded, and the page still shows its last data.
 */
export async function reload(...keys: (string | URL | ((url: URL) => boolean))[]): Promise<void> {
	try {
		await Promise.all(keys.map((key) => invalidate(key)));
	} catch (cause) {
		console.error('[reload] rerunning loads failed', keys, cause);
	}
}
