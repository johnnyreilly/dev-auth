import type { IncomingMessage, ServerResponse } from "node:http";

import { describe, expect, it, vi } from "vitest";

import { DEV_AUTH_COOKIE_NAME, encodePrincipal } from "../cookie.js";
import type { ClientPrincipal } from "../types.js";
import { handleMe } from "./auth-me.js";

const principal: ClientPrincipal = {
	identityProvider: "github",
	userId: "user-1",
	userDetails: "dev@example.com",
	userRoles: ["anonymous", "authenticated"],
	claims: [],
};

function makeReqRes(cookieHeader?: string) {
	const req = {
		headers: { cookie: cookieHeader },
	} as unknown as IncomingMessage;
	const headers: Record<string, unknown> = {};
	let body = "";
	const res = {
		writeHead: vi.fn((_, h: Record<string, unknown>) => {
			Object.assign(headers, h);
		}),
		end: vi.fn((data: string) => {
			body = data;
		}),
	} as unknown as ServerResponse;
	return { req, res, headers, getBody: () => body };
}

describe("handleMe", () => {
	it("returns null clientPrincipal when no cookie", () => {
		const { req, res, getBody } = makeReqRes();
		handleMe(req, res, DEV_AUTH_COOKIE_NAME);
		expect(JSON.parse(getBody())).toStrictEqual({ clientPrincipal: null });
	});

	it("returns decoded principal when cookie is present", () => {
		const cookieValue = encodePrincipal(principal);
		const { req, res, getBody } = makeReqRes(
			`${DEV_AUTH_COOKIE_NAME}=${cookieValue}`,
		);
		handleMe(req, res, DEV_AUTH_COOKIE_NAME);
		expect(JSON.parse(getBody())).toStrictEqual({ clientPrincipal: principal });
	});

	it("returns null for a corrupt cookie", () => {
		const { req, res, getBody } = makeReqRes(
			`${DEV_AUTH_COOKIE_NAME}=!!!notbase64`,
		);
		handleMe(req, res, DEV_AUTH_COOKIE_NAME);
		expect(JSON.parse(getBody())).toStrictEqual({ clientPrincipal: null });
	});

	it("sets Content-Type to application/json", () => {
		const { req, res, headers } = makeReqRes();
		handleMe(req, res, DEV_AUTH_COOKIE_NAME);
		expect(headers["Content-Type"]).toBe("application/json");
	});
});
