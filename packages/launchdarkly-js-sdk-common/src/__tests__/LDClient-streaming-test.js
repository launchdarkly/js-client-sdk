import EventSource, { sources } from './EventSource-mock';

import * as utils from '../utils';
import * as stubPlatform from './stubPlatform';
import { asyncSleep, jsonResponse, makeBootstrap, makeDefaultServer, promiseListener } from './testUtils';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + utils.btoa('{"key":"user"}');
  const user = { key: 'user' };
  const encodedUser = 'eyJrZXkiOiJ1c2VyIn0';
  const hash = '012345789abcde';
  let platform;
  let server;

  beforeEach(() => {
    Object.defineProperty(window, 'EventSource', {
      value: EventSource,
      writable: true,
    });
    for (const key in sources) {
      delete sources[key];
    }

    server = makeDefaultServer();
    platform = stubPlatform.defaults();
  });

  afterEach(() => {
    server.restore();
  });

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

    it('does not connect to the stream by default', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      expectNoStreamIsOpen();
    });

    it('connects to the stream if options.streaming is true', async () => {
      const client = platform.testing.makeClient(envName, user, { streaming: true });
      await client.waitForInitialization();

      expectStreamUrlIsOpen(fullStreamUrlWithUser);
    });

    describe('setStreaming()', () => {
      it('can connect to the stream', async () => {
        const client = platform.testing.makeClient(envName, user);
        await client.waitForInitialization();

        client.setStreaming(true);
        expectStreamUrlIsOpen(fullStreamUrlWithUser);
      });

      it('can disconnect from the stream', async () => {
        const client = platform.testing.makeClient(envName, user);
        await client.waitForInitialization();

        client.setStreaming(true);
        expectStreamUrlIsOpen(fullStreamUrlWithUser);
        client.setStreaming(false);
        expectNoStreamIsOpen();
      });
    });

    describe('on("change")', () => {
      it('connects to the stream if not otherwise overridden', async () => {
        const client = platform.testing.makeClient(envName, user);
        await client.waitForInitialization();
        client.on('change', () => {});

        expectStreamUrlIsOpen(fullStreamUrlWithUser);
      });

      it('also connects if listening for a specific flag', async () => {
        const client = platform.testing.makeClient(envName, user);
        await client.waitForInitialization();
        client.on('change:flagkey', () => {});

        expectStreamUrlIsOpen(fullStreamUrlWithUser);
      });

      it('does not connect if some other kind of event was specified', async () => {
        const client = platform.testing.makeClient(envName, user);
        await client.waitForInitialization();
        client.on('error', () => {});

        expectNoStreamIsOpen();
      });

      it('does not connect if options.streaming is explicitly set to false', async () => {
        const client = platform.testing.makeClient(envName, user, { streaming: false });
        await client.waitForInitialization();
        client.on('change', () => {});

        expectNoStreamIsOpen();
      });

      it('does not connect if setStreaming(false) was called', async () => {
        const client = platform.testing.makeClient(envName, user);
        await client.waitForInitialization();
        client.setStreaming(false);
        client.on('change', () => {});

        expectNoStreamIsOpen();
      });
    });

    describe('off("change")', () => {
      it('disconnects from the stream if all event listeners are removed', async () => {
        const client = platform.testing.makeClient(envName, user);
        const listener1 = () => {};
        const listener2 = () => {};
        await client.waitForInitialization();

        client.on('change', listener1);
        client.on('change:flagkey', listener2);
        client.on('error', () => {});
        expectStreamUrlIsOpen(fullStreamUrlWithUser);

        client.off('change', listener1);
        expectStreamUrlIsOpen(fullStreamUrlWithUser);

        client.off('change:flagkey', listener2);
        expectNoStreamIsOpen();
      });

      it('does not disconnect if setStreaming(true) was called, but still removes event listener', async () => {
        const changes1 = [];
        const changes2 = [];

        const client = platform.testing.makeClient(envName, user);
        const listener1 = allValues => changes1.push(allValues);
        const listener2 = newValue => changes2.push(newValue);
        await client.waitForInitialization();

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
      });
    });

    it('passes the secure mode hash in the stream URL if provided', async () => {
      const client = platform.testing.makeClient(envName, user, { hash: hash });
      await client.waitForInitialization();
      client.on('change:flagkey', () => {});

      expectStreamUrlIsOpen(fullStreamUrlWithUser + '?h=' + hash);
    });

    it('passes withReasons parameter if provided', async () => {
      const client = platform.testing.makeClient(envName, user, { evaluationReasons: true });
      await client.waitForInitialization();
      client.setStreaming(true);

      expectStreamUrlIsOpen(fullStreamUrlWithUser + '?withReasons=true');
    });

    it('passes secure mode hash and withReasons if provided', async () => {
      const client = platform.testing.makeClient(envName, user, { hash: hash, evaluationReasons: true });
      await client.waitForInitialization();
      client.setStreaming(true);

      expectStreamUrlIsOpen(fullStreamUrlWithUser + '?h=' + hash + '&withReasons=true');
    });

    it('handles stream ping message by getting flags', async () => {
      server.respondWith(jsonResponse({ 'enable-foo': { value: true, version: 1 } }));

      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().ping();
      await asyncSleep(20); // give response handler a chance to execute

      expect(client.variation('enable-foo')).toEqual(true);
    });

    it('handles stream put message by updating flags', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().put({
        data: '{"enable-foo":{"value":true,"version":1}}',
      });

      expect(client.variation('enable-foo')).toEqual(true);
    });

    it('updates local storage for put message if using local storage', async () => {
      const platform = stubPlatform.defaults();
      platform.testing.setLocalStorageImmediately(lsKey, '{"enable-foo":false}');

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage' }, platform);
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().put({
        data: '{"enable-foo":{"value":true,"version":1}}',
      });

      expect(client.variation('enable-foo')).toEqual(true);
      const storageData = JSON.parse(platform.testing.getLocalStorageImmediately(lsKey));
      expect(storageData).toMatchObject({ 'enable-foo': { value: true, version: 1 } });
    });

    it('fires global change event when flags are updated from put event', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change', receivedChange.callback);

      streamEvents().put({
        data: '{"enable-foo":{"value":true,"version":1}}',
      });

      const changes = await receivedChange;
      expect(changes).toEqual({
        'enable-foo': { current: true, previous: false },
      });
    });

    it('does not fire change event if new and old values are equivalent JSON objects', async () => {
      const client = platform.testing.makeClient(envName, user, {
        bootstrap: {
          'will-change': 3,
          'wont-change': { a: 1, b: 2 },
        },
      });
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change', receivedChange.callback);

      const putData = {
        'will-change': { value: 4, version: 2 },
        'wont-change': { value: { b: 2, a: 1 }, version: 2 },
      };
      streamEvents().put({ data: JSON.stringify(putData) });

      const changes = await receivedChange;
      expect(changes).toEqual({
        'will-change': { current: 4, previous: 3 },
      });
    });

    it('fires individual change event when flags are updated from put event', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change:enable-foo', receivedChange.callback);

      streamEvents().put({
        data: '{"enable-foo":{"value":true,"version":1}}',
      });

      const args = await receivedChange;
      expect(args).toEqual([true, false]);
    });

    it('handles patch message by updating flag', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().patch({ data: '{"key":"enable-foo","value":true,"version":1}' });

      expect(client.variation('enable-foo')).toEqual(true);
    });

    it('does not update flag if patch version < flag version', async () => {
      const initData = makeBootstrap({ 'enable-foo': { value: 'a', version: 2 } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(client.variation('enable-foo')).toEqual('a');

      client.setStreaming(true);

      streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

      expect(client.variation('enable-foo')).toEqual('a');
    });

    it('does not update flag if patch version == flag version', async () => {
      const initData = makeBootstrap({ 'enable-foo': { value: 'a', version: 2 } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(client.variation('enable-foo')).toEqual('a');

      client.setStreaming(true);

      streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":2}' });

      expect(client.variation('enable-foo')).toEqual('a');
    });

    it('updates flag if patch has a version and flag has no version', async () => {
      const initData = makeBootstrap({ 'enable-foo': { value: 'a' } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(client.variation('enable-foo')).toEqual('a');

      client.setStreaming(true);

      streamEvents().patch({ data: '{"key":"enable-foo","value":"b","version":1}' });

      expect(client.variation('enable-foo')).toEqual('b');
    });

    it('updates flag if flag has a version and patch has no version', async () => {
      const initData = makeBootstrap({ 'enable-foo': { value: 'a', version: 2 } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();

      expect(client.variation('enable-foo')).toEqual('a');

      client.setStreaming(true);

      streamEvents().patch({ data: '{"key":"enable-foo","value":"b"}' });

      expect(client.variation('enable-foo')).toEqual('b');
    });

    it('updates local storage for patch message if using local storage', async () => {
      const platform = stubPlatform.defaults();
      platform.testing.setLocalStorageImmediately(lsKey, '{"enable-foo":false}');

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage' }, platform);
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().put({
        data: '{"enable-foo":{"value":true,"version":1}}',
      });

      expect(client.variation('enable-foo')).toEqual(true);
      const storageData = JSON.parse(platform.testing.getLocalStorageImmediately(lsKey));
      expect(storageData).toMatchObject({ 'enable-foo': { value: true, version: 1 } });
    });

    it('fires global change event when flag is updated from patch event', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change', receivedChange.callback);

      streamEvents().patch({
        data: '{"key":"enable-foo","value":true,"version":1}',
      });

      const changes = await receivedChange;
      expect(changes).toEqual({
        'enable-foo': { current: true, previous: false },
      });
    });

    it('fires individual change event when flag is updated from patch event', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change:enable-foo', receivedChange.callback);

      streamEvents().patch({
        data: '{"key":"enable-foo","value":true,"version":1}',
      });

      const args = await receivedChange;
      expect(args).toEqual([true, false]);
    });

    it('fires global change event when flag is newly created from patch event', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change', receivedChange.callback);

      streamEvents().patch({
        data: '{"key":"enable-foo","value":true,"version":1}',
      });

      const changes = await receivedChange;
      expect(changes).toEqual({
        'enable-foo': { current: true },
      });
    });

    it('fires individual change event when flag is newly created from patch event', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change:enable-foo', receivedChange.callback);

      streamEvents().patch({
        data: '{"key":"enable-foo","value":true,"version":1}',
      });

      const args = await receivedChange;
      expect(args).toEqual([true, undefined]);
    });

    it('handles delete message by deleting flag', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': false } });
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().delete({
        data: '{"key":"enable-foo","version":1}',
      });

      expect(client.variation('enable-foo')).toBeUndefined();
    });

    it('handles delete message for unknown flag by storing placeholder', async () => {
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().delete({
        data: '{"key":"mystery","version":3}',
      });

      // The following patch message should be ignored because it has a lower version than the deleted placeholder
      streamEvents().patch({
        data: '{"key":"mystery","value":"yes","version":2}',
      });

      expect(client.variation('mystery')).toBeUndefined();
    });

    it('ignores delete message with lower version', async () => {
      const initData = makeBootstrap({ flag: { value: 'yes', version: 3 } });
      const client = platform.testing.makeClient(envName, user, { bootstrap: initData });
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().delete({
        data: '{"key":"flag","version":2}',
      });

      expect(client.variation('flag')).toEqual('yes');
    });

    it('fires global change event when flag is deleted', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': true } });
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change', receivedChange.callback);

      streamEvents().delete({
        data: '{"key":"enable-foo","version":1}',
      });

      const changes = await receivedChange;
      expect(changes).toEqual({
        'enable-foo': { previous: true },
      });
    });

    it('fires individual change event when flag is deleted', async () => {
      const client = platform.testing.makeClient(envName, user, { bootstrap: { 'enable-foo': true } });
      await client.waitForInitialization();

      const receivedChange = promiseListener();
      client.on('change:enable-foo', receivedChange.callback);

      streamEvents().delete({
        data: '{"key":"enable-foo","version":1}',
      });

      const args = await receivedChange;
      expect(args).toEqual([undefined, true]);
    });

    it('updates local storage for delete message if using local storage', async () => {
      const platform = stubPlatform.defaults();
      platform.testing.setLocalStorageImmediately(lsKey, '{"enable-foo":false}');

      const client = platform.testing.makeClient(envName, user, { bootstrap: 'localstorage' }, platform);
      await client.waitForInitialization();
      client.setStreaming(true);

      streamEvents().delete({
        data: '{"key":"enable-foo","version":1}',
      });

      expect(client.variation('enable-foo')).toEqual(undefined);
      const storageData = JSON.parse(platform.testing.getLocalStorageImmediately(lsKey));
      expect(storageData).toMatchObject({ 'enable-foo': { version: 1, deleted: true } });
    });

    it('reconnects to stream if the user changes', async () => {
      const user2 = { key: 'user2' };
      const encodedUser2 = 'eyJrZXkiOiJ1c2VyMiJ9';
      const client = platform.testing.makeClient(envName, user);
      await client.waitForInitialization();
      client.setStreaming(true);

      expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser]).toBeDefined();

      await client.identify(user2);
      expect(sources[streamUrl + '/eval/' + envName + '/' + encodedUser2]).toBeDefined();
    });
  });
});
