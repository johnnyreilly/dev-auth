import { describe, expect, it } from "vitest";

import {
	DEV_AUTH_COOKIE_NAME,
	SWA_COOKIE_NAME,
	decodePrincipal,
	encodePrincipal,
	getAuthCookie,
	parseCookies,
} from "./cookie.js";
import type { ClientPrincipal } from "./types.js";

const principal: ClientPrincipal = {
	identityProvider: "aad",
	userId: "abc-123",
	userDetails: "user@example.com",
	userRoles: ["anonymous", "authenticated"],
	claims: [{ typ: "name", val: "Jane Doe" }],
};

describe("parseCookies", () => {
	it("returns empty object for undefined", () => {
		expect(parseCookies(undefined)).toStrictEqual({});
	});

	it("parses a single cookie", () => {
		expect(parseCookies("foo=bar")).toStrictEqual({ foo: "bar" });
	});

	it("parses multiple cookies", () => {
		expect(parseCookies("a=1; b=2; c=3")).toStrictEqual({
			a: "1",
			b: "2",
			c: "3",
		});
	});

	it("handles cookie values containing =", () => {
		const encoded = Buffer.from("hello=world").toString("base64");
		const result = parseCookies(`${DEV_AUTH_COOKIE_NAME}=${encoded}`);
		expect(result[DEV_AUTH_COOKIE_NAME]).toBe(encoded);
	});
});

describe("encodePrincipal / decodePrincipal", () => {
	it("round-trips a principal through base64", () => {
		const encoded = encodePrincipal(principal);
		expect(decodePrincipal(encoded)).toStrictEqual(principal);
	});

	it("returns null for invalid base64", () => {
		expect(decodePrincipal("not-valid-base64!!!")).toBeNull();
	});

	it("returns null for valid base64 but invalid JSON", () => {
		const bad = Buffer.from("not json").toString("base64");
		expect(decodePrincipal(bad)).toBeNull();
	});
});

describe("getAuthCookie", () => {
	it("returns undefined when no cookie header", () => {
		expect(getAuthCookie(undefined, DEV_AUTH_COOKIE_NAME)).toBeUndefined();
	});

	it("returns undefined when cookie is absent", () => {
		expect(getAuthCookie("other=value", DEV_AUTH_COOKIE_NAME)).toBeUndefined();
	});

	it("returns the dev-auth cookie value when present", () => {
		const value = encodePrincipal(principal);
		expect(
			getAuthCookie(
				`${DEV_AUTH_COOKIE_NAME}=${value}; other=x`,
				DEV_AUTH_COOKIE_NAME,
			),
		).toBe(value);
	});

	it("returns the SWA cookie value when using SWA cookie name", () => {
		const value = encodePrincipal(principal);
		expect(
			getAuthCookie(`${SWA_COOKIE_NAME}=${value}; other=x`, SWA_COOKIE_NAME),
		).toBe(value);
	});

	it("does not return SWA cookie when looking for dev-auth cookie", () => {
		const value = encodePrincipal(principal);
		expect(
			getAuthCookie(`${SWA_COOKIE_NAME}=${value}`, DEV_AUTH_COOKIE_NAME),
		).toBeUndefined();
	});
});
