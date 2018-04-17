import EventSource, { sources } from 'eventsourcemock';

import Stream from '../Stream';

const noop = () => {};

describe('Stream', () => {
  const baseUrl = 'https://example.com';
  const envName = 'testenv';
  const user = { key: 'me' };
  const encodedUser = 'eyJrZXkiOiJtZSJ9';
  const hash = '012345789abcde';

  beforeEach(() => {
    Object.defineProperty(window, 'EventSource', {
      value: EventSource,
      writable: true,
    });
  });

  it('should not throw on EventSource when it does not exist', () => {
    const prevEventSource = window.EventSource;
    window.EventSource = undefined;

    const stream = new Stream(baseUrl, envName);

    const connect = () => {
      stream.connect(noop);
    };

    expect(connect).not.toThrow(TypeError);

    window.EventSource = prevEventSource;
  });

  it('should not throw when calling disconnect without first calling connect', () => {
    const stream = new Stream(baseUrl, envName);
    const disconnect = () => {
      stream.disconnect(noop);
    };

    expect(disconnect).not.toThrow(TypeError);
  });

  it('connects to EventSource with eval stream URL by default', () => {
    const stream = new Stream(baseUrl, envName, null, false);
    stream.connect(user, {});

    expect(sources[baseUrl + '/eval/' + envName + '/' + encodedUser]).toBeDefined();
  });

  it('adds secure mode hash to URL if provided', () => {
    const stream = new Stream(baseUrl, envName, hash, false);
    stream.connect(user, {});

    expect(sources[baseUrl + '/eval/' + envName + '/' + encodedUser + '?h=' + hash]).toBeDefined();
  });

  it('falls back to ping stream URL if useReport is true', () => {
    const stream = new Stream(baseUrl, envName, hash, true);
    stream.connect(user, {});

    expect(sources[baseUrl + '/ping/' + envName]).toBeDefined();
  });

  it('sets event listeners', () => {
    const stream = new Stream(baseUrl, envName, hash, false);
    const fn1 = () => 0;
    const fn2 = () => 1;

    stream.connect(user, {
      birthday: fn1,
      anniversary: fn2,
    });

    const es = sources[`${baseUrl}/eval/${envName}/${encodedUser}?h=${hash}`];

    expect(es).toBeDefined();
    expect(es.__emitter._events.birthday).toEqual(fn1);
    expect(es.__emitter._events.anniversary).toEqual(fn2);
  });
});
