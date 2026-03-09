import type { IncomingMessage, ServerResponse } from "node:http";

export function handleLogout(
	req: IncomingMessage,
	res: ServerResponse,
	cookieName: string,
): void {
	const host = req.headers.host ?? "localhost";
	const url = new URL(req.url ?? "/", `http://${host}`);
	const redirectUri = url.searchParams.get("post_logout_redirect_uri") ?? "/";

	res.writeHead(302, {
		"Set-Cookie": `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
		Location: redirectUri,
	});
	res.end();
}
