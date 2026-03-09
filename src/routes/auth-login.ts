import type { IncomingMessage, ServerResponse } from "node:http";

import { loginFormHtml } from "../login-form.js";
import type { Config } from "../types.js";

export function handleLogin(
	req: IncomingMessage,
	res: ServerResponse,
	provider: string,
	config: Config,
): void {
	const html = loginFormHtml(provider, config.cookieName);
	res.writeHead(200, {
		"Content-Type": "text/html; charset=utf-8",
		"Content-Length": Buffer.byteLength(html),
	});
	res.end(html);
}
