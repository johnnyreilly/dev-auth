#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { DEV_AUTH_COOKIE_NAME, SWA_COOKIE_NAME } from "./cookie.js";
import { startServer } from "./server.js";
import { waitForBackend } from "./wait-for-backend.js";
import type { Config } from "./types.js";

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
    --config, -c              Path to config file (default: dev-auth.config.json, or
                              swa-cli.config.json with --swa)
    --config-name, -n         Named configuration to use from the config file
    --swa                     SWA CLI compatibility mode: use StaticWebAppsAuthCookie and
                              config to default to swa-cli.config.json
    --help, -h                Show this help message

  Examples
    $ dev-auth --backend http://localhost:3000
    $ dev-auth --swa --config-name app
    $ dev-auth --run "npm start" --backend http://localhost:3000 --devserver-timeout 30
    $ dev-auth -D http://localhost:5173 --open
`;

interface SwaCliConfig {
	appDevserverUrl?: string;
	port?: number;
	host?: string;
	open?: boolean;
	run?: string;
	devserverTimeout?: number;
}

interface SwaCliConfigFile {
	configurations?: Partial<Record<string, SwaCliConfig>>;
}

function loadSwaCliConfig(
	configPath: string,
	configName: string | undefined,
): SwaCliConfig {
	const resolved = path.resolve(process.cwd(), configPath);
	if (!fs.existsSync(resolved)) return {};

	let file: SwaCliConfigFile;
	try {
		const raw = fs.readFileSync(resolved, "utf8");
		file = JSON.parse(raw) as SwaCliConfigFile;
	} catch (err) {
		console.error(`Warning: could not parse ${resolved}:`, err);
		return {};
	}

	const configs = file.configurations;
	if (!configs || Object.keys(configs).length === 0) return {};

	const keys = Object.keys(configs);

	if (configName) {
		const named = configs[configName];
		if (!named) {
			console.error(
				`Error: configuration "${configName}" not found in ${resolved}.\n` +
					`Available configurations: ${keys.join(", ")}.`,
			);
			process.exit(1);
		}
		return named;
	}

	if (keys.length === 1) {
		return configs[keys[0]] ?? {};
	}

	// Multiple configs, no name specified — use first and warn
	process.stderr.write(
		`Warning: ${resolved} has multiple configurations; using "${keys[0]}". Pass --config-name to choose one.\n`,
	);
	return configs[keys[0]] ?? {};
}

function parseIntOption(
	raw: string,
	flag: string,
	min: number,
	max = Infinity,
): number {
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < min || n > max) {
		console.error(
			`Error: invalid value "${raw}" for ${flag}; expected an integer between ${String(min)} and ${max < Infinity ? String(max) : "∞"}.`,
		);
		process.exit(1);
	}
	return n;
}

export async function main(): Promise<void> {
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
			config: { type: "string", short: "c" },
			"config-name": { type: "string", short: "n" },
			swa: { type: "boolean", default: false },
			help: { type: "boolean", short: "h", default: false },
		},
	});

	if (values.help) {
		process.stdout.write(HELP);
		process.exit(0);
	}

	const configPath =
		values.config ??
		(values.swa ? "swa-cli.config.json" : "dev-auth.config.json");
	const swaConfig = loadSwaCliConfig(configPath, values["config-name"]);

	// --backend and --app-devserver-url / -D are aliases; swa-cli.config.json uses appDevserverUrl
	const backend =
		values.backend ?? values["app-devserver-url"] ?? swaConfig.appDevserverUrl;
	const port =
		values.port !== undefined
			? parseIntOption(values.port, "--port", 1, 65535)
			: (swaConfig.port ?? 4280);
	const host = values.host ?? swaConfig.host ?? "localhost";
	const openBrowser = values.open || (swaConfig.open ?? false);
	const devserverTimeout =
		values["devserver-timeout"] !== undefined
			? parseIntOption(values["devserver-timeout"], "--devserver-timeout", 0)
			: (swaConfig.devserverTimeout ?? 60);
	const runCommand = values.run ?? swaConfig.run;

	if (!backend) {
		console.error(
			"Error: no backend URL specified.\n" +
				'Use --backend <url> (or -D / --app-devserver-url), or set "appDevserverUrl" in swa-cli.config.json.',
		);
		process.exit(1);
	}

	// Validate backend URL early so we can fail with a clear, actionable message.
	let parsedBackendUrl: URL;
	try {
		parsedBackendUrl = new URL(backend);
	} catch {
		console.error(
			`Error: invalid backend URL "${backend}".\n` +
				'Ensure it is a valid URL, including the scheme, e.g. "http://localhost:3000".',
		);
		process.exit(1);
	}

	if (
		parsedBackendUrl.protocol !== "http:" &&
		parsedBackendUrl.protocol !== "https:"
	) {
		console.error(
			`Error: unsupported backend URL protocol "${parsedBackendUrl.protocol}".\n` +
				'Use an "http://" or "https://" URL for --backend (or -D / --app-devserver-url).',
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
	};

	if (runCommand) {
		console.log(`Running: ${runCommand}`);
		const child = spawn(runCommand, {
			shell: true,
			stdio: "inherit",
		});
		child.on("error", (err) => {
			console.error(`Failed to start process: ${err.message}`);
		});
	}

	if (config.devserverTimeout > 0) {
		process.stdout.write(
			`Waiting for backend at ${config.backend} (timeout: ${String(config.devserverTimeout)}s)...`,
		);
		try {
			await waitForBackend(config.backend, config.devserverTimeout);
			process.stdout.write(" ready.\n");
		} catch (err: unknown) {
			process.stdout.write("\n");
			console.error(String(err));
			process.exit(1);
		}
	}

	startServer(config);
}
