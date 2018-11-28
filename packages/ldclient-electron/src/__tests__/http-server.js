import * as http from 'http';

// This is adapted from some helper code in https://github.com/EventSource/eventsource/blob/master/test/eventsource_test.js

let nextPort = 20000;
let servers = [];

export function createServer(callback) {
  const server = http.createServer();
  const port = nextPort++;

  const responses = [];

  server.on('request', (req, res) => {
    responses.push(res);
  });

  const realClose = server.close;
  server.close = callback => {
    responses.forEach(res => res.end());
    realClose.call(server, callback);
  };

  server.url = 'http://localhost:' + port;

  servers.push(server);

  server.listen(port, err => callback(err, server));
}

export function closeServers() {
  servers.forEach(server => server.close());
  servers = [];
}
