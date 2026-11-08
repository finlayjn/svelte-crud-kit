export interface ErrorMessageOptions {
	/**
	 * Which statuses' messages are worth showing (default: 4xx). A 5xx body from SvelteKit is the
	 * generic "Internal Error", so a friendly fallback reads better.
	 */
	showStatus?: (status: number) => boolean;
}

const isClientError = (status: number) => status >= 400 && status < 500;

/**
 * The message a server `error(status, message)` sent with a failed remote call or fetch, if it's
 * worth showing (see `showStatus`). Undefined otherwise.
 */
export function errorMessage(
	error: unknown,
	options: ErrorMessageOptions = {}
): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const { status, body } = error as { status?: unknown; body?: { message?: unknown } };
	if (typeof status !== 'number' || !(options.showStatus ?? isClientError)(status))
		return undefined;
	return typeof body?.message === 'string' && body.message ? body.message : undefined;
}

export interface ReportErrorOptions extends ErrorMessageOptions {
	/** Where the cause is logged (default `console.error`). */
	log?: (message: string, error: unknown) => void;
}

/**
 * Logs a failure with its cause (`[area] fallback`) and returns the text to show the user: the
 * server's own message for a refused request, otherwise `fallback`.
 *
 * ```ts
 * catch (error) {
 *   toasts.error(reportError('widgets', error, 'Could not save the widget.'));
 * }
 * ```
 */
export function reportError(
	area: string,
	error: unknown,
	fallback: string,
	options: ReportErrorOptions = {}
): string {
	(options.log ?? console.error)(`[${area}] ${fallback}`, error);
	return errorMessage(error, options) ?? fallback;
}
