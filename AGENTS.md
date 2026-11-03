# AGENTS.md

Hammock is a zero-dependency Node.js 22+ CLI serving JSON files as a local read-only mock API. It is local-only and unsecured: no authentication, authorization, or configurable CORS allowlist. `README.md` is canonical and wins over this digest. This is a repository agent guide, not a user manual or a security control; safety overrides task completion.

## Stop and ask

Stop and ask before:
- starting from a home directory, repository root, a real project, or an untrusted project;
- serving real, customer, production, or secret data;
- using real cookies or credentials;
- using production/personal private keys;
- exposing via a public listener, proxy, port forward, or tunnel;
- weakening a safety warning.

## Safety rules

- Never expose Hammock via public bind, port forward, reverse proxy, or tunnel; stop with Ctrl+C.
- Serve only a dedicated synthetic-data folder. Every routable `.json`, including dotfiles, is readable if guessed; no listing is not confidentiality. No secrets, tokens, credentials, keys, production or customer data.
- Never start from a home directory, repository root, real project, or untrusted project; `package.json` becomes routable.
- HTTPS is transport-only; it does not make exposure, proxying, or tunneling safe. Use a development-only certificate trusted for `127.0.0.1`, ideally covering `localhost`; keep certificates/keys outside the served folder and repository; restrict permissions (`chmod` `600` where supported); never print, commit, upload, or paste private keys.
- Hammock never creates/fetches certificates or falls back to HTTP; startup fails if the certificate or key cannot be read or loaded.
- Do not run `mkcert -install`, install a local root CA, or modify trust stores without explicit approval and a clear reason.

## Commands

Node.js 22+; installation is user setup, not repository work; avoid unnecessary installs/upgrades and arbitrary packages; prefer an existing checkout.

```bash
node --version
npm install -g @myteril/hammock-cli
```

From a unique disposable fixture outside the repository:

```bash
cd /path/to/disposable-fixture
hammock
hammock --port 3000
hammock --https --cert /path/to/certs/cert.pem --key /path/to/certs/key.pem
hammock --help
hammock --version
```

Defaults start at `3000` and move upward; `--port` takes `1`–`65535` and aborts if busy; `--cert`/`--key` require `--https` and must stay outside the served fixture and repository; startup fails if either cannot load; use only documented commands, never invented scripts or tests.

## Behavior contract

- Routes append `.json` to the last segment (`users.json` → `/users`); nesting mirrors folders; queries are ignored; `.json` URLs return `404`.
- No directory listings; escaping symlinks return `404`; each request re-reads and fully loads the file, so keep mock files small.
- `GET`/`POST`/`PUT` return the JSON; `OPTIONS` returns `204`; others return `405` with `Allow`; POST/PUT bodies are read and discarded; over `1 MiB` returns `413`.
- CORS reflects one syntactically valid `http`/`https` `Origin` exactly in `Access-Control-Allow-Origin`, never `*`, and sends `Access-Control-Allow-Credentials: true`; credentialed browser requests work.
- Preflight approves `GET`/`POST`/`PUT`/`OPTIONS`; valid `Access-Control-Request-Headers` is echoed in `Access-Control-Allow-Headers`; missing/invalid values omit it, never `*`.
- With valid reflected `Origin`, `400`/`404`/`405`/`413`/`500` responses carry the same CORS headers. Missing, invalid, multiple, `null`, or non-HTTP(S) origins get none but are processed normally; `file://`, sandboxed frames, `null` origins unsupported.
- Reflection is not an allowlist: any allowed `http`/`https` page can read the JSON with credentials. Credentials are never validated or protected, merely browser-carried.
- Cookies are host-scoped and usually ignore ports; `127.0.0.1:3000` may receive another local service's `127.0.0.1` cookies.
- Loopback, read-only, credentialed CORS, and a trusted local certificate provide no authentication or access control.
- Preserve exact status codes, headers, flags, suffixes, and limits; add no undocumented behavior.

## Change rules

- Read `README.md` before behavior changes; keep zero runtime dependencies, Node.js 22+, built-ins only, no config/build, and one-command design.
- Preserve loopback-only binding, path containment, symlink rejection, no listings, `1 MiB` limit, method/CORS/HTTPS semantics, and exact status codes, headers, flags, suffixes, limits; add no undocumented behavior.
- Add no authentication, a CORS allowlist, writes, telemetry, public binding, or production hardening without request; scope changes.
- Update `README.md`, and `AGENTS.md` together; keep technical tokens unchanged.
- If code and documentation disagree, report it; never silently rewrite docs to match code.
- Report security issues without exploiting them; never rewrite docs to match insecure code. Security changes need approval and tests/docs.
- Match existing Markdown style; add no tests, harnesses, CI, or tooling without request.

## Verify before finishing

- Use a unique disposable fixture outside the repository with synthetic data only, never anonymized production data.
- Point symlink tests at harmless synthetic JSON, never home, `/etc`, credentials, or real projects.
- Check happy path, `.json` URL `404`, symlink escape `404`, methods, `413`, and CORS (valid/invalid origins, preflight, errors).
- Check port fallback, busy `--port`, and HTTPS startup failure with missing/unreadable certificate or key.
- For browser tests use an isolated profile; no real cookies, proxy, tunnel, or non-loopback listener.
- Stop the server and remove fixtures/certificates; run tests only if documented, never add a suite.

## References

- `README.md`: full behavior, options, HTTPS, troubleshooting.
- `LICENSE`: MIT text; do not reproduce.
