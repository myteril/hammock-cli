'use strict';

const fs = require('node:fs');
const path = require('node:path');
const tls = require('node:tls');
const { parseArgs } = require('node:util');

const pkg = require('../package.json');

const HELP = `Usage: hammock [options]

Start a read-only mock JSON API for the current folder.

Options:
  -p, --port <number>  Port to use (1-65535); default: first free port from 3000
      --https          Serve over HTTPS (requires --cert and --key)
      --cert <path>    PEM certificate or certificate chain
      --key <path>     PEM private key
  -h, --help           Show this help
  -v, --version        Show the version
`;

const SERVER_LOAD_ERROR = 'Unable to load the server implementation.';
const HTTPS_CREATE_ERROR =
  'Unable to create the HTTPS server. Check the certificate and key files.';

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliError';
  }
}

function sanitize(value, limit = 500) {
  const text = String(value ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .trim();
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function formatArgumentError(error) {
  if (error && error.code === 'ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL') {
    return 'Positional arguments are not supported.';
  }
  return sanitize(error && error.message) || 'Invalid arguments.';
}

function parsePort(value) {
  if (value === undefined) {
    return undefined;
  }
  if (!/^[1-9][0-9]{0,4}$/.test(value) || Number(value) > 65535) {
    throw new CliError('Invalid value for --port. Use an integer from 1 to 65535.');
  }
  return Number(value);
}

function parseOptions(args) {
  let parsed;
  try {
    parsed = parseArgs({
      args,
      allowPositionals: false,
      strict: true,
      options: {
        port: { type: 'string', short: 'p' },
        https: { type: 'boolean' },
        cert: { type: 'string' },
        key: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' }
      }
    });
  } catch (error) {
    throw new CliError(formatArgumentError(error));
  }

  const values = parsed.values;
  if (values.help) {
    return { action: 'help' };
  }
  if (values.version) {
    return { action: 'version' };
  }

  const hasCert = values.cert !== undefined;
  const hasKey = values.key !== undefined;
  if (values.https) {
    if (!values.cert || !values.key) {
      throw new CliError('--https requires both --cert and --key.');
    }
  } else if (hasCert || hasKey) {
    throw new CliError('--cert and --key require --https.');
  }

  return {
    action: 'serve',
    port: parsePort(values.port),
    https: Boolean(values.https),
    cert: values.cert,
    key: values.key
  };
}

function readPem(label, filePath) {
  try {
    return fs.readFileSync(path.resolve(filePath));
  } catch {
    throw new CliError(`Unable to read the ${label} file.`);
  }
}

function validateTlsMaterial(cert, key) {
  try {
    tls.createSecureContext({ cert, key });
  } catch {
    throw new CliError(HTTPS_CREATE_ERROR);
  }
}

function loadExport(modulePath, exportName) {
  let loaded;
  try {
    loaded = require(modulePath);
  } catch {
    throw new CliError(SERVER_LOAD_ERROR);
  }

  const fn = typeof loaded === 'function' ? loaded : loaded && loaded[exportName];
  if (typeof fn !== 'function') {
    throw new CliError(SERVER_LOAD_ERROR);
  }
  return fn;
}

async function start(options, stdout) {
  const rootDir = process.cwd();
  const cert = options.https ? readPem('certificate', options.cert) : undefined;
  const key = options.https ? readPem('key', options.key) : undefined;
  if (options.https) {
    validateTlsMaterial(cert, key);
  }
  const createServer = loadExport('./server', 'createServer');
  const listen = loadExport('./port', 'listen');

  let server;
  try {
    server = await createServer({
      rootDir,
      https: options.https,
      cert,
      key
    });
  } catch {
    throw new CliError(
      options.https
        ? HTTPS_CREATE_ERROR
        : 'Unable to create the server.'
    );
  }

  try {
    await listen(server, options.port);
  } catch (error) {
    if (server.listening) {
      server.close();
    }
    throw error;
  }

  const address = server.address();
  if (!address || address.address !== '127.0.0.1') {
    server.close();
    throw new CliError('The server did not bind to 127.0.0.1.');
  }

  const port = address.port;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    server.close();
    throw new CliError('The server did not report a valid port.');
  }

  stdout.write(`Serving ${sanitize(rootDir)}\n`);
  stdout.write(`Listening on ${options.https ? 'https' : 'http'}://127.0.0.1:${port}\n`);
}

async function main(argv = process.argv.slice(2), streams = process) {
  try {
    const options = parseOptions(argv);
    if (options.action === 'help') {
      streams.stdout.write(HELP);
      return;
    }
    if (options.action === 'version') {
      streams.stdout.write(`${pkg.version}\n`);
      return;
    }
    await start(options, streams.stdout);
  } catch (error) {
    const message = sanitize(error && error.message) || 'Unexpected error.';
    streams.stderr.write(`hammock: ${message}\n`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
