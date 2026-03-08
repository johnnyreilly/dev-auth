import http from "node:http";
import net from "node:net";

import { createProxyServer } from "httpxy";
import open from "open";

import { getAuthCookie } from "./cookie.js";
import { handleLogin } from "./routes/auth-login.js";
import { handleLogout } from "./routes/auth-logout.js";
import { handleMe } from "./routes/auth-me.js";
import type { Config } from "./types.js";

const LOGIN_PATH_RE = /^\/.auth\/login\/([^/?]+)/;

export function startServer(config: Config): void {
	const proxy = createProxyServer({ changeOrigin: true });

	proxy.on("error", (err, _req, res) => {
		const message = `Proxy error: ${err.message}`;
		if (res instanceof http.ServerResponse) {
			res.writeHead(502, { "Content-Type": "text/plain" });
			res.end(message);
		}
	});

	const server = http.createServer((req, res) => {
		const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

		if (pathname === "/.auth/me") {
			handleMe(req, res, config.cookieName);
			return;
		}

		if (pathname === "/.auth/logout") {
			handleLogout(req, res, config.cookieName);
			return;
		}

		const loginMatch = LOGIN_PATH_RE.exec(pathname);
		if (loginMatch) {
			handleLogin(req, res, loginMatch[1], config);
			return;
		}

		// Inject x-ms-client-principal header before proxying
		const cookieValue = getAuthCookie(req.headers.cookie, config.cookieName);
		if (cookieValue) {
			req.headers["x-ms-client-principal"] = cookieValue;
		}

		void proxy.web(req, res, { target: config.backend });
	});

	server.on("upgrade", (req, socket, head) => {
		const cookieValue = getAuthCookie(req.headers.cookie, config.cookieName);
		if (cookieValue) {
			req.headers["x-ms-client-principal"] = cookieValue;
		}
		void proxy.ws(req, socket as net.Socket, { target: config.backend }, head);
	});

	server.listen(config.port, config.host, () => {
		const origin = `http://${config.host}:${String(config.port)}`;
		console.log(`dev-auth listening on ${origin}`);
		console.log(`  Proxying to: ${config.backend}`);
		console.log(`  Login:  ${origin}/.auth/login/aad`);
		console.log(`  Me:     ${origin}/.auth/me`);
		console.log(`  Logout: ${origin}/.auth/logout`);

		if (config.open) {
			void open(origin);
		}
	});
}
