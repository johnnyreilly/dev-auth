import http from "node:http";
import https from "node:https";

export async function waitForBackend(
	url: string,
	timeoutSeconds: number,
): Promise<void> {
	const deadline = Date.now() + timeoutSeconds * 1000;
	const client = url.startsWith("https") ? https : http;

	while (Date.now() < deadline) {
		const ready = await probe(client, url);
		if (ready) return;
		await sleep(500);
	}

	throw new Error(
		`Backend at ${url} did not respond within ${String(timeoutSeconds)} seconds.`,
	);
}

function probe(
	client: typeof http | typeof https,
	url: string,
): Promise<boolean> {
	return new Promise((resolve) => {
		const req = client.get(url, { timeout: 1000 }, (res) => {
			res.resume();
			resolve(true);
		});
		req.on("error", () => {
			resolve(false);
		});
		req.on("timeout", () => {
			req.destroy();
			resolve(false);
		});
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
