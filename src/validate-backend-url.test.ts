import { describe, expect, it } from "vitest";

import { validateBackendUrl } from "./validate-backend-url.js";

describe("validateBackendUrl", () => {
	it("accepts a valid http URL", () => {
		const result = validateBackendUrl("http://localhost:3000");
		expect(result.ok).toBe(true);
		expect((result as Extract<typeof result, { ok: true }>).url.href).toBe(
			"http://localhost:3000/",
		);
	});

	it("accepts a valid https URL", () => {
		const result = validateBackendUrl("https://example.com");
		expect(result.ok).toBe(true);
	});

	it("rejects a URL without a scheme", () => {
		const result = validateBackendUrl("localhost:3000");
		expect(result.ok).toBe(false);
		expect(
			(result as Extract<typeof result, { ok: false }>).message,
		).toMatch(/Only http:\/\/ and https:\/\/ schemes/);
	});

	it("rejects a plain hostname", () => {
		const result = validateBackendUrl("localhost");
		expect(result.ok).toBe(false);
		expect(
			(result as Extract<typeof result, { ok: false }>).message,
		).toMatch(/invalid backend URL/);
	});

	it("rejects an ftp:// URL", () => {
		const result = validateBackendUrl("ftp://example.com");
		expect(result.ok).toBe(false);
		expect(
			(result as Extract<typeof result, { ok: false }>).message,
		).toMatch(/Only http:\/\/ and https:\/\/ schemes/);
	});

	it("rejects a file:// URL", () => {
		const result = validateBackendUrl("file:///etc/passwd");
		expect(result.ok).toBe(false);
		expect(
			(result as Extract<typeof result, { ok: false }>).message,
		).toMatch(/Only http:\/\/ and https:\/\/ schemes/);
	});

	it("rejects an empty string", () => {
		const result = validateBackendUrl("");
		expect(result.ok).toBe(false);
		expect(
			(result as Extract<typeof result, { ok: false }>).message,
		).toMatch(/invalid backend URL/);
	});
});
