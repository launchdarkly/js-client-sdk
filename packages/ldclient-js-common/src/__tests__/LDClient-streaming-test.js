import sinon from 'sinon';
import EventSource, { sources } from './EventSource-mock';

import * as LDClient from '../index';
import * as utils from '../utils';
import * as stubPlatform from './stubPlatform';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user"}');
  const user = { key: 'user' };
  const encodedUser = 'eyJrZXkiOiJ1c2VyIn0';
  const hash = '012345789abcde';
  let warnSpy;
  let xhr;
  let requests = [];
  let platform;

  beforeEach(() => {
    Object.defineProperty(window, 'EventSource', {
      value: EventSource,
      writable: true,
    });

    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };

    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    for (const key in sources) {
      delete sources[key];
    }

    platform = stubPlatform.defaults();
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
    warnSpy.mockRestore();
  });

  function getLastRequest() {
    return requests[requests.length - 1];
  }

  describe('streaming/event listening', () => {
    const streamUrl = 'https://clientstream.launchdarkly.com';

    function streamEvents() {
      return sources[`${streamUrl}/eval/${envName}/${encodedUser}`].__emitter._events;
    }

    it('does not connect to the stream by default', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        expect(sources).toMatchObject({});
        done();
      });
    });

    it('connects to the stream when listening to global change events', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});
        expect(Object.keys(sources)).toEqual([streamUrl + '/eval/' + envName + '/' + encodedUser]);
        done();
      });
    });

    it('connects to the stream when listening to change event for one flag', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change:flagkey', () => {});
        expect(Object.keys(sources)).toEqual([streamUrl + '/eval/' + envName + '/' + encodedUser]);
        done();
      });
    });

    it('passes the secure mode hash in the stream URL if provided', done => {
      const client = platform.testing.makeClient(envName, user, { hash: hash, bootstrap: {} });

      client.on('ready', () => {
        client.on('change:flagkey', () => {});
        expect(Object.keys(sources)).toEqual([streamUrl + '/eval/' + envName + '/' + encodedUser + '?h=' + hash]);
        done();
      });
    });

    it('passes withReasons parameter if provided', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, evaluationReasons: true });

      client.on('ready', () => {
        client.on('change', () => {});
        expect(Object.keys(sources)).toEqual([
          streamUrl + '/eval/' + envName + '/' + encodedUser + '?withReasons=true',
        ]);
        done();
      });
    });

    it('passes secure mode hash and withReasons if provided', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, hash: hash, evaluationReasons: true });

      client.on('ready', () => {
        client.on('change', () => {});
        expect(Object.keys(sources)).toEqual([
          streamUrl + '/eval/' + envName + '/' + encodedUser + '?h=' + hash + '&withReasons=true',
        ]);
        done();
      });
    });

    it('handles stream ping message by getting flags', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});
        streamEvents().ping();
        getLastRequest().respond(
          200,
          { 'Content-Type': 'application/json' },
          '{"enable-foo":{"value":true,"version":1}}'
        );
        expect(client.variation('enable-foo')).toEqual(true);
        done();
      });
    });

    it('handles stream put message by updating flags', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });

        expect(client.variation('enable-foo')).toEqual(true);
        done();
      });
    });

    it('updates local storage for put message if using local storage', done => {
      const platform = stubPlatform.defaults();
      platform.localStorage.set(lsKey, '{"enable-foo":false}', () => {
        const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' }, platform).client;

        client.on('ready', () => {
          client.on('change', () => {});

          streamEvents().put({
            data: '{"enable-foo":{"value":true,"version":1}}',
          });

          expect(client.variation('enable-foo')).toEqual(true);
          platform.localStorage.get(lsKey, (err, value) => {
            expect(JSON.parse(value)).toEqual({
              $schema: 1,
              'enable-foo': { value: true, version: 1 },
            });
            done();
          });
        });
      });
    });

    it('fires global change event when flags are updated from put event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { current: true, previous: false },
          });

          done();
        });

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });
      });
    });

    it('fires individual change event when flags are updated from put event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(true);
          expect(previous).toEqual(false);

          done();
        });

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });
      });
    });

    it('handles patch message by updating flag', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":true,"version":1}' });

        expect(client.variation('enable-foo')).toEqual(true);
        done();
      });
    });

    it('does not update flag if patch version < flag version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a","version":2}}']);

      const client = platform.testing.makeClient(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

        expect(client.variation('enable-foo')).toEqual('a');

        done();
      });
      server.respond();
    });

    it('does not update flag if patch version == flag version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a","version":2}}']);

      const client = platform.testing.makeClient(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

        expect(client.variation('enable-foo')).toEqual('a');

        done();
      });
      server.respond();
    });

    it('updates flag if patch has a version and flag has no version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a"}}']);

      const client = platform.testing.makeClient(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

        expect(client.variation('enable-foo')).toEqual('b');

        done();
      });
      server.respond();
    });

    it('updates flag if flag has a version and patch has no version', done => {
      const server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, '{"enable-foo":{"value":"a","version":2}}']);

      const client = platform.testing.makeClient(envName, user);
      client.on('ready', () => {
        expect(client.variation('enable-foo')).toEqual('a');

        client.on('change', () => {});

        streamEvents().patch({ data: '{"key":"enable-foo","value":"b"}' });

        expect(client.variation('enable-foo')).toEqual('b');

        done();
      });
      server.respond();
    });

    it('updates local storage for patch message if using local storage', done => {
      const platform = stubPlatform.defaults();
      platform.localStorage.set(lsKey, '{"enable-foo":false}', () => {
        const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' }, platform).client;

        client.on('ready', () => {
          client.on('change', () => {});

          streamEvents().put({
            data: '{"enable-foo":{"value":true,"version":1}}',
          });

          expect(client.variation('enable-foo')).toEqual(true);
          platform.localStorage.get(lsKey, (err, value) => {
            expect(JSON.parse(value)).toEqual({
              $schema: 1,
              'enable-foo': { value: true, version: 1 },
            });
            done();
          });
        });
      });
    });

    it('fires global change event when flag is updated from patch event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { current: true, previous: false },
          });

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('fires individual change event when flag is updated from patch event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(true);
          expect(previous).toEqual(false);

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('fires global change event when flag is newly created from patch event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { current: true },
          });

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('fires global change event when flag is newly created from patch event', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(true);
          expect(previous).toEqual(undefined);

          done();
        });

        streamEvents().patch({
          data: '{"key":"enable-foo","value":true,"version":1}',
        });
      });
    });

    it('handles delete message by deleting flag', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });

        expect(client.variation('enable-foo')).toBeUndefined();
        done();
      });
    });

    it('fires global change event when flag is deleted', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': true } });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'enable-foo': { previous: true },
          });

          done();
        });

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });
      });
    });

    it('fires individual change event when flag is deleted', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': true } });

      client.on('ready', () => {
        client.on('change:enable-foo', (current, previous) => {
          expect(current).toEqual(undefined);
          expect(previous).toEqual(true);

          done();
        });

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });
      });
    });

    it('updates local storage for delete message if using local storage', done => {
      const platform = stubPlatform.defaults();
      platform.localStorage.set(lsKey, '{"enable-foo":false}', () => {
        const client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' }, platform).client;

        client.on('ready', () => {
          client.on('change', () => {});

          streamEvents().delete({
            data: '{"key":"enable-foo","version":1}',
          });

          expect(client.variation('enable-foo')).toEqual(undefined);
          platform.localStorage.get(lsKey, (err, value) => {
            expect(JSON.parse(value)).toEqual({
              $schema: 1,
              'enable-foo': { version: 1, deleted: true },
            });
            done();
          });
        });
      });
    });

    it('reconnects to stream if the user changes', done => {
      const user2 = { key: 'user2' };
      const encodedUser2 = 'eyJrZXkiOiJ1c2VyMiJ9';
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        client.on('change', () => {});

        expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser]).toBeDefined();

        client.identify(user2, null, () => {
          expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser2]).toBeDefined();
          done();
        });

        utils.onNextTick(() =>
          getLastRequest().respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": {"value": true}}')
        );
      });
    });
  });
});
