<h1 align="center">Dev Auth</h1>

<p align="center">
	An authentication emulator to be used for local development / testing.  `dev-auth` can be used as a drop in replacement for the <a href="https://azure.github.io/static-web-apps-cli/docs/cli/local-auth"> local authentication option of the Azure Static Web Apps CLI</a>.
</p>

<p align="center">
	<!-- prettier-ignore-start -->
	<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
	<a href="#contributors" target="_blank"><img alt="👪 All Contributors: 1" src="https://img.shields.io/badge/%F0%9F%91%AA_all_contributors-1-21bb42.svg" /></a>
<!-- ALL-CONTRIBUTORS-BADGE:END -->
	<!-- prettier-ignore-end -->
	<a href="https://github.com/johnnyreilly/dev-auth/blob/main/.github/CODE_OF_CONDUCT.md" target="_blank"><img alt="🤝 Code of Conduct: Kept" src="https://img.shields.io/badge/%F0%9F%A4%9D_code_of_conduct-kept-21bb42" /></a>
	<a href="https://codecov.io/gh/johnnyreilly/dev-auth" target="_blank"><img alt="🧪 Coverage" src="https://img.shields.io/codecov/c/github/johnnyreilly/dev-auth?label=%F0%9F%A7%AA%20coverage" /></a>
	<a href="https://github.com/johnnyreilly/dev-auth/blob/main/LICENSE.md" target="_blank"><img alt="📝 License: MIT" src="https://img.shields.io/badge/%F0%9F%93%9D_license-MIT-21bb42.svg" /></a>
	<a href="http://npmjs.com/package/dev-auth" target="_blank"><img alt="📦 npm version" src="https://img.shields.io/npm/v/dev-auth?color=21bb42&label=%F0%9F%93%A6%20npm" /></a>
	<img alt="💪 TypeScript: Strict" src="https://img.shields.io/badge/%F0%9F%92%AA_typescript-strict-21bb42.svg" />
</p>

## What it does

`dev-auth` is a drop-in replacement for the auth layer of the [Azure Static Web Apps CLI](https://azure.github.io/static-web-apps-cli/). It handles the `/.auth/*` routes locally and reverse-proxies all other traffic to your app's dev server — without pulling in the full SWA CLI.

- `GET /.auth/login/{provider}` — serves a login form where you set a fake user identity
- `GET /.auth/me` — returns the current user as `{ clientPrincipal }` JSON
- `GET /.auth/logout` — clears the auth cookie and redirects
- All other requests — proxied to your backend, with the `x-ms-client-principal` header injected

## Usage

```shell
pnpm add -D dev-auth
```

Point it at your running dev server:

```shell
dev-auth --backend http://localhost:3000
```

Or use the SWA CLI-compatible flag:

```shell
dev-auth --swa -D http://localhost:5173
```

Optionally launch your dev server and wait for it to be ready before starting:

```shell
dev-auth --run "npm start" --backend http://localhost:3000 --devserver-timeout 30
```

### Options

| Flag | Alias | Default | Description |
|------|-------|---------|-------------|
| `--backend` | `-b`, `--app-devserver-url`, `-D` | — | Backend URL to proxy to (required) |
| `--port` | `-p` | `4280` | Port to listen on |
| `--host` | `-q` | `localhost` | Host address to bind to |
| `--open` | `-o` | `false` | Open browser on startup |
| `--run` | `-r` | — | Shell command to spawn at startup |
| `--devserver-timeout` | `-t` | `60` | Seconds to wait for backend to be ready |
| `--swa` | | `false` | Use `StaticWebAppsAuthCookie` (default: `dev-auth-cookie`) |
| `--config` | `-c` | `dev-auth.json` | Path to config file |

### Config file

Options can also be set in `dev-auth.json` at the project root. CLI flags take precedence.

```json
{
  "backend": "http://localhost:3000",
  "port": 4280,
  "defaultUser": {
    "identityProvider": "aad",
    "userId": "a3c9a2c0-0000-0000-0000-000000000000",
    "userDetails": "user@example.com",
    "userRoles": ["anonymous", "authenticated"],
    "claims": []
  }
}
```

## Development

See [`.github/CONTRIBUTING.md`](./.github/CONTRIBUTING.md), then [`.github/DEVELOPMENT.md`](./.github/DEVELOPMENT.md).
Thanks! 💖

> 💝 This package was templated with [`create-typescript-app`](https://github.com/JoshuaKGoldberg/create-typescript-app) using the [Bingo framework](https://create.bingo).
