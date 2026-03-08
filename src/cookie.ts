import type { ClientPrincipal } from "./types.js";

export const SWA_COOKIE_NAME = "StaticWebAppsAuthCookie";
export const DEV_AUTH_COOKIE_NAME = "dev-auth-cookie";

export function parseCookies(
	header: string | undefined,
): Record<string, string> {
	if (!header) return {};
	return Object.fromEntries(
		header.split(";").map((part) => {
			const [key, ...rest] = part.trim().split("=");
			return [key.trim(), rest.join("=").trim()];
		}),
	);
}

export function getAuthCookie(
	header: string | undefined,
	cookieName: string,
): string | undefined {
	return parseCookies(header)[cookieName];
}

export function decodePrincipal(cookieValue: string): ClientPrincipal | null {
	try {
		const json = Buffer.from(cookieValue, "base64").toString("utf8");
		return JSON.parse(json) as ClientPrincipal;
	} catch {
		return null;
	}
}

export function encodePrincipal(principal: ClientPrincipal): string {
	return Buffer.from(JSON.stringify(principal)).toString("base64");
}
