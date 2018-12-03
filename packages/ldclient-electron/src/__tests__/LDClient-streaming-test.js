import * as httpServer from './http-server';

import * as LDClient from '../index';

// Unlike the LDClient-streaming-test.js in ldclient-js-common, which tests the client streaming logic
// against a mock EventSource, this does end-to-end testing against an embedded HTTP server to verify
// that the EventSource implementation we're using in Electron basically works.

describe('LDClient streaming', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  const encodedUser = 'eyJrZXkiOiJ1c2VyIn0';
  const expectedGetUrl = '/eval/' + envName + '/' + encodedUser;
  const expectedReportUrl = '/eval/' + envName;

  afterEach(() => {
    httpServer.closeServers();
  });

  function writeStream(res, flags) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    res.write('event: put\ndata: ' + JSON.stringify(flags) + '\n\n');
    res.end();
  }

  function readAll(req, callback) {
    let body = '';
    req.on('data', data => {
      body += data;
    });
    req.on('end', () => callback(body));
  }

  it('makes GET request and receives an event', done => {
    httpServer.createServer((err, server) => {
      err && done.fail(err);

      server.on('request', (req, res) => {
        expect(req.url).toEqual(expectedGetUrl);
        expect(req.method).toEqual('GET');

        writeStream(res, { flag: { value: 'yes', version: 1 } });
      });

      const config = { bootstrap: {}, streaming: true, streamUrl: server.url };
      const client = LDClient.initializeInMain(envName, user, config);
      client.on('change:flag', value => {
        expect(value).toEqual('yes');
        server.close(done);
      });
    });
  });

  it('makes REPORT request and receives an event', done => {
    httpServer.createServer((err, server) => {
      err && done.fail(err);

      server.on('request', (req, res) => {
        expect(req.url).toEqual(expectedReportUrl);
        expect(req.method).toEqual('REPORT');
        readAll(req, body => {
          expect(body).toEqual(JSON.stringify(user));

          writeStream(res, { flag: { value: 'yes', version: 1 } });
        });
      });

      const config = { bootstrap: {}, streaming: true, streamUrl: server.url, useReport: true };
      const client = LDClient.initializeInMain(envName, user, config);
      client.on('change:flag', value => {
        expect(value).toEqual('yes');
        server.close(done);
      });
    });
  });
});
