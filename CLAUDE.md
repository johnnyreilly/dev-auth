# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```shell
pnpm install       # Install dependencies
pnpm build         # Build src/ → lib/ using tsdown
pnpm tsc           # Type check (no emit)
pnpm lint          # ESLint with zero warnings tolerance
pnpm run lint --fix  # Auto-fix lint issues
pnpm run test      # Run all tests with vitest
pnpm run test --coverage  # Run tests with coverage report in coverage/
```

Run a single test file:

```shell
pnpm run test src/cookie.test.ts
```

**IMPORTANT**

After all code changes, run in this order:

```shell
pnpm tsc && pnpm build && pnpm lint && pnpm run test
```

Note: Run `pnpm build` before `pnpm lint` — some lint rules check the built output in `lib/`.

## Architecture

`dev-auth` is a Node.js CLI tool that emulates the auth layer of the Azure Static Web Apps CLI. It listens on port 4280 (default), handles `/.auth/*` routes locally, and reverse-proxies all other traffic to a backend dev server.

**Source (`src/`) → built output (`lib/`)** via tsdown with `unbundle: true` (one output file per source file). The CLI binary is `lib/cli.js`, registered in `package.json` under `"bin"`.

### Key files

- `src/cli.ts` — CLI entry point; parses flags with `meow`, loads `dev-auth.json`, optionally spawns `--run` subprocess, waits for backend, calls `startServer()`
- `src/server.ts` — `http.createServer()` router; delegates to route handlers or proxies via `httpxy`; opens browser if `--open`
- `src/wait-for-backend.ts` — polls a URL until it responds or timeout expires
- `src/cookie.ts` — encode/decode `StaticWebAppsAuthCookie` (plain base64 JSON, no encryption)
- `src/login-form.ts` — generates the login form HTML; client-side JS sets the cookie on submit
- `src/types.ts` — `ClientPrincipal`, `Config`, `DefaultUser` interfaces
- `src/routes/auth-login.ts` — serves the login form at `/.auth/login/{provider}`
- `src/routes/auth-me.ts` — returns `{ clientPrincipal }` from cookie at `/.auth/me`
- `src/routes/auth-logout.ts` — clears the cookie and redirects at `/.auth/logout`

### Auth flow

1. `GET /.auth/login/{provider}` → server renders HTML form (pre-filled from `defaultUser` in config)
2. User submits form → browser JS encodes principal as `btoa(JSON.stringify(...))` and sets `StaticWebAppsAuthCookie`
3. `GET /.auth/me` → server reads cookie, base64-decodes, returns `{ clientPrincipal }`
4. All other requests → proxied to `--backend` URL; `x-ms-client-principal` header injected (same base64 value as cookie)
5. `GET /.auth/logout` → cookie cleared, redirect to `post_logout_redirect_uri` or `/`

### CLI flags

All flags can also be set in `dev-auth.json`. CLI flags override config file values.

| Flag                  | Alias                             | Default         | Description                             |
| --------------------- | --------------------------------- | --------------- | --------------------------------------- |
| `--backend`           | `-b`, `--app-devserver-url`, `-D` | —               | Backend URL to proxy to (required)      |
| `--port`              | `-p`                              | `4280`          | Port to listen on                       |
| `--host`              | `-q`                              | `localhost`     | Host address to bind to                 |
| `--open`              | `-o`                              | `false`         | Open browser on startup                 |
| `--run`               | `-r`                              | —               | Shell command to spawn at startup       |
| `--devserver-timeout` | `-t`                              | `60`            | Seconds to wait for backend to be ready |
| `--config`            | `-c`                              | `dev-auth.json` | Path to config file                     |

### Config file (`dev-auth.json`)

```json
{
	"backend": "http://localhost:3000",
	"port": 4280,
	"host": "localhost",
	"open": false,
	"devserverTimeout": 60,
	"defaultUser": {
		"identityProvider": "aad",
		"userId": "a3c9a2c0-0000-0000-0000-000000000000",
		"userDetails": "user@example.com",
		"userRoles": ["anonymous", "authenticated"],
		"claims": []
	}
}
```

## Key Constraints

- **console-fail-test** is active in all test runs: any call to `console.log`, `console.warn`, etc. will fail tests.
- TypeScript is configured in strict mode with `NodeNext` module resolution — imports must use `.js` extensions (e.g. `import { foo } from "./foo.js"`).
- ESLint uses `strictTypeChecked` + `stylisticTypeChecked` from typescript-eslint with zero warnings allowed.
- Prettier runs automatically on commit via husky + lint-staged.
