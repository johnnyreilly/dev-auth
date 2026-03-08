#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { DEV_AUTH_COOKIE_NAME, SWA_COOKIE_NAME } from "./cookie.js";
import { startServer } from "./server.js";
import { waitForBackend } from "./wait-for-backend.js";
import type { Config, DefaultUser } from "./types.js";

const HELP = `
  Usage
    $ dev-auth [options]

  Options
    --backend, -b, --app-devserver-url, -D
                              Backend URL to proxy non-auth requests to
    --port, -p                Port to listen on (default: 4280)
    --host, -q                Host address to bind to (default: localhost)
    --open, -o                Open the browser on startup
    --run, -r <command>       Shell command to run at startup (e.g. your dev server)
    --devserver-timeout, -t   Seconds to wait for the backend to be ready (default: 60)
    --config, -c              Path to config file (default: dev-auth.json)
    --swa                     Use StaticWebAppsAuthCookie (default: dev-auth-cookie)
    --help, -h                Show this help message

  Examples
    $ dev-auth --backend http://localhost:3000
    $ dev-auth --run "npm start" --backend http://localhost:3000 --devserver-timeout 30
    $ dev-auth -D http://localhost:5173 --open
`;

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		backend: { type: "string", short: "b" },
		"app-devserver-url": { type: "string", short: "D" },
		port: { type: "string", short: "p" },
		host: { type: "string", short: "q" },
		open: { type: "boolean", short: "o", default: false },
		run: { type: "string", short: "r" },
		"devserver-timeout": { type: "string", short: "t" },
		config: { type: "string", short: "c", default: "dev-auth.json" },
		swa: { type: "boolean", default: false },
		help: { type: "boolean", short: "h", default: false },
	},
});

if (values.help) {
	process.stdout.write(HELP);
	process.exit(0);
}

interface ConfigFile {
	backend?: string;
	port?: number;
	host?: string;
	open?: boolean;
	devserverTimeout?: number;
	defaultUser?: DefaultUser;
}

function loadConfigFile(configPath: string): ConfigFile {
	const resolved = path.resolve(process.cwd(), configPath);
	if (!fs.existsSync(resolved)) return {};
	try {
		const raw = fs.readFileSync(resolved, "utf8");
		return JSON.parse(raw) as ConfigFile;
	} catch (err) {
		console.error(`Warning: could not parse config file ${resolved}:`, err);
		return {};
	}
}

// config is guaranteed to be set by parseArgs default
const fileConfig = loadConfigFile(values.config);

// --backend and --app-devserver-url / -D are aliases; CLI flags take precedence over config file
const backend =
	values.backend ?? values["app-devserver-url"] ?? fileConfig.backend;
let port: number;
if (values.port !== undefined) {
	const parsedPort = Number.parseInt(values.port, 10);
	if (!Number.isFinite(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
		console.error(
			`Error: invalid port "${values.port}". Port must be an integer between 1 and 65535.`,
		);
		process.exit(1);
	}
	port = parsedPort;
} else {
	port = fileConfig.port ?? 4280;
}
const host = values.host ?? fileConfig.host ?? "localhost";
const openBrowser = values.open || (fileConfig.open ?? false);
let devserverTimeout: number;
if (values["devserver-timeout"] !== undefined) {
	const parsed = parseInt(values["devserver-timeout"], 10);
	if (!Number.isFinite(parsed) || parsed < 0) {
		console.error(
			"Error: invalid value for --devserver-timeout; expected a non-negative integer.",
		);
		process.exit(1);
	}
	devserverTimeout = parsed;
} else if (fileConfig.devserverTimeout !== undefined) {
	if (
		typeof fileConfig.devserverTimeout !== "number" ||
		!Number.isFinite(fileConfig.devserverTimeout) ||
		fileConfig.devserverTimeout < 0
	) {
		console.error(
			'Error: invalid "devserverTimeout" value in config file; expected a non-negative number.',
		);
		process.exit(1);
	}
	devserverTimeout = fileConfig.devserverTimeout;
} else {
	devserverTimeout = 60;
}

if (!backend) {
	console.error(
		"Error: no backend URL specified.\n" +
			'Use --backend <url> (or -D / --app-devserver-url) or set "backend" in dev-auth.json.',
	);
	process.exit(1);
}

const config: Config = {
	backend,
	port,
	host,
	open: openBrowser,
	devserverTimeout,
	cookieName: values.swa ? SWA_COOKIE_NAME : DEV_AUTH_COOKIE_NAME,
	defaultUser: fileConfig.defaultUser,
};

async function main(): Promise<void> {
	if (values.run) {
		console.log(`Running: ${values.run}`);
		const child = spawn(values.run, {
			shell: true,
			stdio: "inherit",
		});
		child.on("error", (err) => {
			console.error(`Failed to start process: ${err.message}`);
		});
	}

	if (devserverTimeout > 0) {
		process.stdout.write(
			`Waiting for backend at ${config.backend} (timeout: ${String(devserverTimeout)}s)...`,
		);
		try {
			await waitForBackend(config.backend, devserverTimeout);
			process.stdout.write(" ready.\n");
		} catch (err: unknown) {
			process.stdout.write("\n");
			console.error(String(err));
			process.exit(1);
		}
	}

	startServer(config);
}

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
