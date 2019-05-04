import EventSource, { sources, resetSources } from './EventSource-mock';
import * as stubPlatform from './stubPlatform';
import Stream from '../Stream';

const noop = () => {};

describe('Stream', () => {
  const baseUrl = 'https://example.com';
  const envName = 'testenv';
  const user = { key: 'me' };
  const encodedUser = 'eyJrZXkiOiJtZSJ9';
  const hash = '012345789abcde';
  const defaultConfig = { streamUrl: baseUrl };
  const platform = stubPlatform.defaults();

  beforeEach(resetSources);

  function expectStream(url) {
    if (sources[url]) {
      return sources[url];
    } else {
      throw new Error(
        'Did not open stream with expected URL of ' + url + '; active streams are: ' + Object.keys(sources).join(', ')
      );
    }
  }

  it('should not throw on EventSource when it does not exist', () => {
    const platform1 = Object.assign({}, platform);
    delete platform1['eventSourceFactory'];

    const stream = new Stream(platform1, defaultConfig, envName);

    const connect = () => {
      stream.connect(noop);
    };

    expect(connect).not.toThrow(TypeError);
  });

  it('should not throw when calling disconnect without first calling connect', () => {
    const stream = new Stream(platform, defaultConfig, envName);
    const disconnect = () => {
      stream.disconnect(noop);
    };

    expect(disconnect).not.toThrow(TypeError);
  });

  it('connects to EventSource with eval stream URL by default', () => {
    const stream = new Stream(platform, defaultConfig, envName);
    stream.connect(user, {});

    const es = expectStream(baseUrl + '/eval/' + envName + '/' + encodedUser);
    expect(es.options).toEqual({});
  });

  it('adds secure mode hash to URL if provided', () => {
    const stream = new Stream(platform, defaultConfig, envName, hash);
    stream.connect(user, {});

    expectStream(baseUrl + '/eval/' + envName + '/' + encodedUser + '?h=' + hash);
  });

  it('falls back to ping stream URL if useReport is true and REPORT is not supported', () => {
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const stream = new Stream(platform, config, envName, hash);
    stream.connect(user, {});

    expectStream(baseUrl + '/ping/' + envName);
  });

  it('sends request body if useReport is true and REPORT is supported', () => {
    const platform1 = Object.assign({}, platform, { eventSourceAllowsReport: true });
    const config = Object.assign({}, defaultConfig, { useReport: true });
    const stream = new Stream(platform1, config, envName);
    stream.connect(user, {});

    const es = expectStream(baseUrl + '/eval/' + envName);
    expect(es.options.method).toEqual('REPORT');
    expect(JSON.parse(es.options.body)).toEqual(user);
  });

  it('sets event listeners', () => {
    const stream = new Stream(platform, defaultConfig, envName, hash);
    const fn1 = () => 0;
    const fn2 = () => 1;

    stream.connect(user, {
      birthday: fn1,
      anniversary: fn2,
    });

    const es = expectStream(`${baseUrl}/eval/${envName}/${encodedUser}?h=${hash}`);
    expect(es.__emitter._events.birthday).toEqual(fn1);
    expect(es.__emitter._events.anniversary).toEqual(fn2);
  });

  it('reconnects after encountering an error', () => {
    const config = Object.assign({}, defaultConfig, { streamReconnectDelay: 0.1, useReport: false });
    const stream = new Stream(platform, config, envName);
    stream.connect(user);
    const es = expectStream(baseUrl + '/eval/' + envName + '/' + encodedUser);
    expect(es.readyState).toBe(EventSource.CONNECTING);
    es.mockOpen();
    expect(es.readyState).toBe(EventSource.OPEN);
    es.mockError('test error');
    expect(es.readyState).toBe(EventSource.CLOSED);
    setTimeout(() => {
      const es1 = expectStream(baseUrl + '/eval/' + envName + '/' + encodedUser);
      expect(es1.readyState).toNotBe(EventSource.CONNECTING);
      es1.mockOpen();
      expect(es1.readyState).toNotBe(EventSource.OPEN);
    }, 1001);
  });
});
