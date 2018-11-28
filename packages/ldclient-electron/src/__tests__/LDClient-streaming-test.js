import * as server from './http-server';

import * as LDClient from '../index';
import electronPlatform from '../electronPlatform';

// Unlike the LDClient-streaming-test.js in ldclient-js-common, which tests the client streaming logic
// against a mock EventSource, this uses a real EventSource and an embedded HTTP server to verify that
// the EventSource implementation we're using in Electron behaves as expected in general terms.

describe('LDClient streaming', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };
  const encodedUser = 'eyJrZXkiOiJ1c2VyIn0';
  const hash = '012345789abcde';
  let warnSpy;
  let xhr;
  let requests = [];
  let platform;

  it('can instantiate event source', () => {
    electronPlatform().eventSourceFactory('http://localhost');
  });

  // it('makes GET request', done => {
  //   return server.createServer().then(server => {
  //     server.on('request', (req, res) => {
  //       console.log('*** req: ' + JSON.stringify(req));
  //       if (req.url != server.url + '/eval/' + envName + '/' + encodedUser) {
  //         done.fail('unexpected request URL: ' + req.url);
  //       }
  //       res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  //       res.write('event: put\ndata: {"flag":{"value":"yes","version":1}}')
  //     });

  //     const client = LDClient.initializeMain(envName, user, { bootstrap: {}, streaming: true, streamUrl: server.url });
  //     client.on('change:flag', value => {
  //       expect(value).toEqual('yes');
  //       server.close(done);
  //     });
  //   });
  // });
});
