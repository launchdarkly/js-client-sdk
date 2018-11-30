import sinon from 'sinon';
import EventSource, { sources } from './EventSource-mock';

import * as utils from '../utils';
import * as stubPlatform from './stubPlatform';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user"}');
  const user = { key: 'user' };
  const encodedUser = 'eyJrZXkiOiJ1c2VyIn0';
  const hash = '012345789abcde';
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

    for (const key in sources) {
      delete sources[key];
    }

    platform = stubPlatform.defaults();
  });

  afterEach(() => {
    requests = [];
    xhr.restore();
  });

  function getLastRequest() {
    return requests[requests.length - 1];
  }

  describe('streaming/event listening', () => {
    const streamUrl = 'https://clientstream.launchdarkly.com';
    const fullStreamUrlWithUser = streamUrl + '/eval/' + envName + '/' + encodedUser;

    function streamEvents() {
      return sources[fullStreamUrlWithUser].__emitter._events;
    }

    function expectStreamUrlIsOpen(url) {
      expect(Object.keys(sources)).toEqual([url]);
    }

    function expectNoStreamIsOpen() {
      expect(sources).toMatchObject({});
    }

    it('does not connect to the stream by default', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

      client.on('ready', () => {
        expectNoStreamIsOpen();
        done();
      });
    });

    it('connects to the stream if options.streaming is true', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, streaming: true });

      client.on('ready', () => {
        expectStreamUrlIsOpen(fullStreamUrlWithUser);
        done();
      });
    });

    describe('setStreaming()', () => {
      it('can connect to the stream', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

        client.on('ready', () => {
          client.setStreaming(true);
          expectStreamUrlIsOpen(fullStreamUrlWithUser);
          done();
        });
      });

      it('can disconnect from the stream', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

        client.on('ready', () => {
          client.setStreaming(true);
          expectStreamUrlIsOpen(fullStreamUrlWithUser);
          client.setStreaming(false);
          expectNoStreamIsOpen();
          done();
        });
      });
    });

    describe('on("change")', () => {
      it('connects to the stream if not otherwise overridden', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

        client.on('ready', () => {
          client.on('change', () => {});
          expectStreamUrlIsOpen(fullStreamUrlWithUser);
          done();
        });
      });

      it('also connects if listening for a specific flag', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

        client.on('ready', () => {
          client.on('change:flagkey', () => {});
          expectStreamUrlIsOpen(fullStreamUrlWithUser);
          done();
        });
      });

      it('does not connect if some other kind of event was specified', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

        client.on('ready', () => {
          client.on('error', () => {});
          expectNoStreamIsOpen();
          done();
        });
      });

      it('does not connect if options.streaming is explicitly set to false', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {}, streaming: false });

        client.on('ready', () => {
          client.on('change', () => {});
          expectNoStreamIsOpen();
          done();
        });
      });

      it('does not connect if setStreaming(false) was called', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });

        client.on('ready', () => {
          client.setStreaming(false);
          client.on('change', () => {});
          expectNoStreamIsOpen();
          done();
        });
      });
    });

    describe('off("change")', () => {
      it('disconnects from the stream if all event listeners are removed', done => {
        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });
        const listener1 = () => {};
        const listener2 = () => {};

        client.on('ready', () => {
          client.on('change', listener1);
          client.on('change:flagkey', listener2);
          client.on('error', () => {});
          expectStreamUrlIsOpen(fullStreamUrlWithUser);

          client.off('change', listener1);
          expectStreamUrlIsOpen(fullStreamUrlWithUser);

          client.off('change:flagkey', listener2);
          expectNoStreamIsOpen();

          done();
        });
      });

      it('does not disconnect if setStreaming(true) was called, but still removes event listener', done => {
        const changes1 = [];
        const changes2 = [];

        const client = platform.testing.makeClient(envName, user, { bootstrap: {} });
        const listener1 = allValues => changes1.push(allValues);
        const listener2 = newValue => changes2.push(newValue);

        client.on('ready', () => {
          client.setStreaming(true);

          client.on('change', listener1);
          client.on('change:flag', listener2);
          expectStreamUrlIsOpen(fullStreamUrlWithUser);

          streamEvents().put({
            data: '{"flag":{"value":"a","version":1}}',
          });

          expect(changes1).toEqual([{ flag: { current: 'a', previous: undefined } }]);
          expect(changes2).toEqual(['a']);

          client.off('change', listener1);
          expectStreamUrlIsOpen(fullStreamUrlWithUser);

          streamEvents().put({
            data: '{"flag":{"value":"b","version":1}}',
          });

          expect(changes1).toEqual([{ flag: { current: 'a', previous: undefined } }]);
          expect(changes2).toEqual(['a', 'b']);

          client.off('change:flag', listener2);
          expectStreamUrlIsOpen(fullStreamUrlWithUser);

          streamEvents().put({
            data: '{"flag":{"value":"c","version":1}}',
          });

          expect(changes1).toEqual([{ flag: { current: 'a', previous: undefined } }]);
          expect(changes2).toEqual(['a', 'b']);

          done();
        });
      });
    });

    it('passes the secure mode hash in the stream URL if provided', done => {
      const client = platform.testing.makeClient(envName, user, { hash: hash, bootstrap: {} });

      client.on('ready', () => {
        client.on('change:flagkey', () => {});
        expectStreamUrlIsOpen(fullStreamUrlWithUser + '?h=' + hash);
        done();
      });
    });

    it('passes withReasons parameter if provided', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, evaluationReasons: true });

      client.on('ready', () => {
        client.on('change', () => {});
        expectStreamUrlIsOpen(fullStreamUrlWithUser + '?withReasons=true');
        done();
      });
    });

    it('passes secure mode hash and withReasons if provided', done => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: {}, hash: hash, evaluationReasons: true });

      client.on('ready', () => {
        client.on('change', () => {});
        expectStreamUrlIsOpen(fullStreamUrlWithUser + '?h=' + hash + '&withReasons=true');
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
      platform.testing.setLocalStorageImmediately(lsKey, '{"enable-foo":false}');

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage' }, platform);

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });

        expect(client.variation('enable-foo')).toEqual(true);
        const value = platform.testing.getLocalStorageImmediately(lsKey);
        expect(JSON.parse(value)).toEqual({
          $schema: 1,
          'enable-foo': { value: true, version: 1 },
        });

        done();
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

    it('does not fire change event if new and old values are equivalent JSON objects', done => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: {
          'will-change': 3,
          'wont-change': { a: 1, b: 2 },
        },
      });

      client.on('ready', () => {
        client.on('change', changes => {
          expect(changes).toEqual({
            'will-change': { current: 4, previous: 3 },
          });

          done();
        });

        const putData = {
          'will-change': { value: 4, version: 2 },
          'wont-change': { value: { b: 2, a: 1 }, version: 2 },
        };
        streamEvents().put({ data: JSON.stringify(putData) });
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
      platform.testing.setLocalStorageImmediately(lsKey, '{"enable-foo":false}');

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage' }, platform);

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().put({
          data: '{"enable-foo":{"value":true,"version":1}}',
        });

        expect(client.variation('enable-foo')).toEqual(true);
        const value = platform.testing.getLocalStorageImmediately(lsKey);
        expect(JSON.parse(value)).toEqual({
          $schema: 1,
          'enable-foo': { value: true, version: 1 },
        });

        done();
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
      platform.testing.setLocalStorageImmediately(lsKey, '{"enable-foo":false}');

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage' }, platform);

      client.on('ready', () => {
        client.on('change', () => {});

        streamEvents().delete({
          data: '{"key":"enable-foo","version":1}',
        });

        expect(client.variation('enable-foo')).toEqual(undefined);
        const value = platform.testing.getLocalStorageImmediately(lsKey);
        expect(JSON.parse(value)).toEqual({
          $schema: 1,
          'enable-foo': { version: 1, deleted: true },
        });

        done();
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
