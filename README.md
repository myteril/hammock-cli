# Hammock

> Turn a folder of JSON files into a working mock API with one command — no backend code, no config files, no dependencies.

![Node.js 22+](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white) ![MIT License](https://img.shields.io/badge/license-MIT-blue) ![0 dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)

**English Documentation** · [Turkish Documentation](README.tur.md) · [AI Agent Instructions](AGENTS.md)

## Local-only warning

> [!WARNING]
> **Hammock is for local development only, and it is not secured.** It has no authentication, no authorization, no CORS control. Never use it in production or on a public server, and never expose it through port forwarding, a reverse proxy, or a tunnel.
>
> **Serve a dedicated folder that holds only synthetic mock data.** Every routable `.json` file in that folder, including dot-prefixed hidden files, can be read whenever its route is known or guessed, and the absence of a directory listing is not confidentiality. Do not place secrets, tokens, credentials, private keys, production data, or customer data in the served folder.
>
> **Do not start Hammock from your home directory, a real project or repository root, or an untrusted project**, because files such as `package.json` would become routable. Stop the server with Ctrl+C when you are done.

## Why Hammock?

- **One command, zero setup.** Run `hammock` inside a folder and every JSON file in it becomes an endpoint.
- **Routes mirror your folders.** Any nesting depth works, and the URL pattern never changes.
- **No extra packages.** Hammock runs on Node.js built-in modules only.
- **Ports pick themselves.** Hammock takes the first free port from `3000`; `--port` pins a specific one.
- **Always current.** Files are re-read on every request, so edits show up without a restart.

Hammock fits frontend work: prototype a screen, demo a feature, or hand a client realistic responses before the real API exists.

## Quick start

Hammock needs Node.js 22 or newer:

```bash
node --version
```

Install it globally:

```bash
npm install -g @myteril/hammock-cli
```

Create a folder with a JSON file or two:

```text
my-project/
├── users.json
└── orders/
    └── latest.json
```

```json
{
  "id": 1,
  "name": "Ada Lovelace",
  "role": "developer"
}
```

Start Hammock from that folder:

```bash
cd my-project
hammock
```

```text
Serving /path/to/my-project
Listening on http://127.0.0.1:3000
```

Both endpoints are now live:

- http://127.0.0.1:3000/users
- http://127.0.0.1:3000/orders/latest

Hammock serves the folder you start it from and listens on `127.0.0.1` only, so those endpoints work on your machine alone.

## How routes work

Hammock appends `.json` to the last segment of the URL, so routes never carry the extension:

| File | URL |
|---|---|
| `users.json` | `/users` |
| `orders/latest.json` | `/orders/latest` |
| `api/v1/products.json` | `/api/v1/products` |

- Query parameters are ignored: `/users?role=admin` serves `users.json`.
- A URL whose last segment already ends in `.json` returns `404`, so request `/users`, not `/users.json`.
- Nested folders work to any depth, and directory listings are never served.
- Symbolic links that resolve outside the served folder are not served and return `404`.
- Every request re-reads the file from disk and loads it fully into memory, so keep mock files reasonably small.

## Requests and browser access

Hammock is read-only: it never creates, modifies, or deletes files. Read-only behavior prevents writes, not reads, and is not an access-control boundary.

| Method | Result |
|---|---|
| `GET`, `POST`, `PUT` | The same JSON file is returned |
| `OPTIONS` | `204` preflight response |
| Anything else | `405` with an `Allow` header |

POST and PUT bodies are read and discarded. A body larger than `1 MiB` is rejected with `413`.

> **CORS is permissive, not disabled.** Hammock reflects any single syntactically valid `http` or `https` `Origin` in `Access-Control-Allow-Origin`, always as the exact origin and never as `*`, and it sends `Access-Control-Allow-Credentials: true` for those requests. Credentialed `fetch` requests such as `credentials: 'include'` and `XMLHttpRequest` requests with `withCredentials = true` are therefore supported. Preflight requests approve `GET`, `POST`, `PUT`, and `OPTIONS`; a syntactically valid `Access-Control-Request-Headers` value such as `Content-Type, Authorization` is echoed in `Access-Control-Allow-Headers`, while a missing or invalid value omits that header instead of falling back to `*`. Error responses such as `400`, `404`, `405`, `413`, and `500` carry the same CORS headers, so browser code can read them. A missing, invalid, multiple, `null`, or non-HTTP(S) `Origin` gets no CORS response headers, but the request is still processed normally. Origin reflection is not an origin allowlist: any `http` or `https` page your browser allows to reach this server — including sites you did not create — can read the served JSON, with credentials if it asks for them, and non-browser clients can ignore CORS entirely. Hammock still has no authentication and no authorization and never validates or uses credentials; the browser merely carries them, and the server does not protect them. Cookies are host-scoped and generally ignore ports, so a request to `127.0.0.1:3000` may carry cookies another local service set for `127.0.0.1`, subject to browser cookie policy. `Origin: null`, `file://` pages, sandboxed frames, and non-HTTP(S) origins are unsupported; serve the frontend from a normal local `http` origin instead. 

## Options

| Option | Description |
|---|---|
| `-p, --port <number>` | Use a specific port: an integer from `1` to `65535` |
| `--https` | Serve over HTTPS; requires `--cert` and `--key` |
| `--cert <path>` | PEM certificate or certificate chain |
| `--key <path>` | PEM private key |
| `-h, --help` | Show the help text |
| `-v, --version` | Show the version number |

Without `--port`, Hammock starts at `3000` and moves upward until it finds a free port. With `--port`, a busy port stops startup with an error; drop the option to let Hammock choose, or pick another port. `--cert` and `--key` are valid only together with `--https`, and `--https` fails if either of them is missing.

## HTTPS

```bash
hammock --https --cert ./cert.pem --key ./key.pem
```

The certificate must be trusted by your browser and valid for `127.0.0.1`, ideally with `localhost` in its Subject Alternative Names; an untrusted certificate earns a browser warning. Hammock does not create certificates, download them, or contact a certificate authority. If the certificate or key cannot be read or loaded, the server does not start — it never falls back to HTTP.

HTTPS protects transport only. It does not make public exposure, proxying, or tunneling safe.

> [!IMPORTANT]
> **Keep certificate and key files outside the served folder, and restrict access to the private key.** Never reuse or commit a production private key; use a certificate dedicated to local development.

On macOS or Linux you can tighten the key file permissions:

```bash
chmod 600 key.pem
```

For a locally trusted certificate you can use `mkcert`:

```bash
mkcert -install
mkcert -cert-file cert.pem -key-file key.pem 127.0.0.1 localhost
```

`mkcert -install` installs a local root CA that browsers and applications trust. Run it only on a machine you control and understand.

## Troubleshooting

| Problem | Fix |
|---|---|
| `404` although the file exists | The URL probably ends in `.json` or the path is wrong; request `/orders/latest`, not `/orders/latest.json`. |
| `404` for a symlinked file | The link resolves outside the served folder, so Hammock refuses to serve it. |
| Port already in use | The `--port` value is taken; omit `--port` or choose a different port. |
| Browser certificate warning | The certificate is not trusted or does not cover `127.0.0.1`; check trust and Subject Alternative Names. |
| `413` | A POST or PUT body is larger than `1 MiB`. |
| `405` | The method is not `GET`, `POST`, `PUT`, or `OPTIONS`. |
| No CORS headers in `curl` | No valid `Origin` header was sent; this is expected and the request was still served. |
| Credentialed request fails with a CORS error | Serve the page from a normal `http` or `https` origin, not `file://` or a sandboxed `null` origin, and check that the response carries the exact reflected `Origin` plus `Access-Control-Allow-Credentials: true`. |

## License

Hammock is released under the MIT License. See [LICENSE](LICENSE) for the full text.