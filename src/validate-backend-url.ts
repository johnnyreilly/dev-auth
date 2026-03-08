/**
 * Validates a backend URL string. Returns the parsed URL on success, or a
 * user-friendly error message string on failure.
 */
export function validateBackendUrl(
	backend: string,
): { ok: true; url: URL } | { ok: false; message: string } {
	let url: URL;
	try {
		url = new URL(backend);
	} catch {
		return {
			ok: false,
			message: `Error: invalid backend URL "${backend}". Expected a full URL, e.g. http://localhost:3000.`,
		};
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return {
			ok: false,
			message: `Error: invalid backend URL "${backend}". Only http:// and https:// schemes are supported.`,
		};
	}

	return { ok: true, url };
}
