'use strict';

const HOST = '127.0.0.1';
const FIRST_PORT = 3000;
const LAST_PORT = 65535;

function bind(server, port) {
  return new Promise((resolve, reject) => {
    function onError(error) {
      server.off('listening', onListening);
      reject(error);
    }

    function onListening() {
      server.off('error', onError);
      resolve();
    }

    server.once('error', onError);
    server.once('listening', onListening);

    try {
      server.listen(port, HOST);
    } catch (error) {
      server.off('error', onError);
      server.off('listening', onListening);
      reject(error);
    }
  });
}

function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= LAST_PORT;
}

function bindError(error, port) {
  if (error && error.code === 'EACCES') {
    return new Error(`Permission denied while binding to ${HOST}:${port}.`);
  }
  return new Error(`Unable to bind to ${HOST}:${port}.`);
}

async function listen(server, requestedPort) {
  if (requestedPort !== undefined) {
    if (!isValidPort(requestedPort)) {
      throw new Error('The port must be an integer from 1 to 65535.');
    }

    try {
      await bind(server, requestedPort);
    } catch (error) {
      if (error && error.code === 'EADDRINUSE') {
        throw new Error(
          `Port ${requestedPort} is already in use. Omit --port to let Hammock choose a free port, or choose a different port.`
        );
      }
      throw bindError(error, requestedPort);
    }
    return;
  }

  for (let port = FIRST_PORT; port <= LAST_PORT; port += 1) {
    try {
      await bind(server, port);
      return;
    } catch (error) {
      if (error && error.code === 'EADDRINUSE') {
        continue;
      }
      throw bindError(error, port);
    }
  }

  throw new Error(`No free port is available between ${FIRST_PORT} and ${LAST_PORT}.`);
}

module.exports = { listen };
