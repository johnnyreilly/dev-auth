import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { DEV_AUTH_COOKIE_NAME } from "../cookie.js";
import { handleLogout } from "./auth-logout.js";

function makeReqRes(url: string) {
	const req = {
		url,
		headers: { host: "localhost:4280" },
	} as unknown as IncomingMessage;
	const headers: Record<string, unknown> = {};
	let status = 0;
	const res = {
		writeHead: vi.fn((s: number, h: Record<string, unknown>) => {
			status = s;
			Object.assign(headers, h);
		}),
		end: vi.fn(),
	} as unknown as ServerResponse;
	return { req, res, headers, getStatus: () => status };
}

describe("handleLogout", () => {
	it("redirects to / by default", () => {
		const { req, res, headers, getStatus } = makeReqRes("/.auth/logout");
		handleLogout(req, res, DEV_AUTH_COOKIE_NAME);
		expect(getStatus()).toBe(302);
		expect(headers.Location).toBe("/");
	});

	it("redirects to post_logout_redirect_uri when provided", () => {
		const { req, res, headers } = makeReqRes(
			"/.auth/logout?post_logout_redirect_uri=/dashboard",
		);
		handleLogout(req, res, DEV_AUTH_COOKIE_NAME);
		expect(headers.Location).toBe("/dashboard");
	});

	it("clears the auth cookie", () => {
		const { req, res, headers } = makeReqRes("/.auth/logout");
		handleLogout(req, res, DEV_AUTH_COOKIE_NAME);
		expect(String(headers["Set-Cookie"])).toContain(
			`${DEV_AUTH_COOKIE_NAME}=;`,
		);
		expect(String(headers["Set-Cookie"])).toContain("Expires=Thu, 01 Jan 1970");
	});
});
