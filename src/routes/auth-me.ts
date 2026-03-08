import type { IncomingMessage, ServerResponse } from "node:http";

import { decodePrincipal, getAuthCookie } from "../cookie.js";

export function handleMe(
	req: IncomingMessage,
	res: ServerResponse,
	cookieName: string,
): void {
	const cookieValue = getAuthCookie(req.headers.cookie, cookieName);
	const clientPrincipal = cookieValue ? decodePrincipal(cookieValue) : null;

	const body = JSON.stringify({ clientPrincipal });
	res.writeHead(200, {
		"Content-Type": "application/json",
		"Content-Length": Buffer.byteLength(body),
	});
	res.end(body);
}
