import sinon from 'sinon';

import EventProcessor from '../EventProcessor';

describe('EventProcessor', () => {
  let sandbox;
  let warnSpy;
  const mockEventSender = {};
  const user = { key: 'userKey', name: 'Red' };
  const filteredUser = { key: 'userKey', privateAttrs: ['name'] };
  const eventsUrl = '/fake-url';

  mockEventSender.sendEvents = function(events, sync) {
    mockEventSender.calls.push({
      events: events,
      sync: !!sync,
    });
    return Promise.resolve({ serverTime: mockEventSender.serverTime, status: mockEventSender.status || 200 });
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockEventSender.calls = [];
    mockEventSender.serverTime = null;
  });

  afterEach(() => {
    sandbox.restore();
    warnSpy.mockRestore();
  });

  function checkFeatureEvent(e, source, debug, inlineUser) {
    expect(e.kind).toEqual(debug ? 'debug' : 'feature');
    expect(e.creationDate).toEqual(source.creationDate);
    expect(e.key).toEqual(source.key);
    expect(e.version).toEqual(source.version);
    expect(e.value).toEqual(source.value);
    expect(e.default).toEqual(source.default);
    if (inlineUser) {
      expect(e.user).toEqual(inlineUser);
    } else {
      expect(e.userKey).toEqual(source.user.key);
    }
  }

  function checkCustomEvent(e, source, inlineUser) {
    expect(e.kind).toEqual('custom');
    expect(e.creationDate).toEqual(source.creationDate);
    expect(e.key).toEqual(source.key);
    expect(e.data).toEqual(source.data);
    if (inlineUser) {
      expect(e.user).toEqual(inlineUser);
    } else {
      expect(e.userKey).toEqual(source.user.key);
    }
  }

  function checkSummaryEvent(e) {
    expect(e.kind).toEqual('summary');
  }

  it('should flush asynchronously', () => {
    const processor = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const event = { kind: 'identify', key: user.key };

    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.flush();

    expect(mockEventSender.calls.length).toEqual(1);
    expect(mockEventSender.calls[0].sync).toEqual(false);
  });

  it('should flush synchronously', () => {
    const processor = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const user = { key: 'foo' };
    const event = { kind: 'identify', key: user.key };

    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.flush(true);

    expect(mockEventSender.calls.length).toEqual(1);
    expect(mockEventSender.calls[0].sync).toEqual(true);
  });

  it('should enqueue identify event', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const event = { kind: 'identify', creationDate: 1000, key: user.key, user: user };
    ep.enqueue(event);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      expect(mockEventSender.calls[0].events).toEqual([event]);
      done();
    });
  });

  it('filters user in identify event', done => {
    const config = { allAttributesPrivate: true };
    const ep = EventProcessor(eventsUrl, config, null, mockEventSender);
    const event = { kind: 'identify', creationDate: 1000, key: user.key, user: user };
    ep.enqueue(event);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      expect(mockEventSender.calls[0].events).toEqual([
        {
          kind: 'identify',
          creationDate: event.creationDate,
          key: user.key,
          user: filteredUser,
        },
      ]);
      done();
    });
  });

  it('queues individual feature event', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const event = {
      kind: 'feature',
      creationDate: 1000,
      key: 'flagkey',
      user: user,
      trackEvents: true,
    };
    ep.enqueue(event);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      checkFeatureEvent(output[0], event, false);
      checkSummaryEvent(output[1]);
      done();
    });
  });

  it('can include inline user in feature event', done => {
    const config = { inlineUsersInEvents: true };
    const ep = EventProcessor(eventsUrl, config, null, mockEventSender);
    const event = {
      kind: 'feature',
      creationDate: 1000,
      key: 'flagkey',
      user: user,
      trackEvents: true,
    };
    ep.enqueue(event);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      checkFeatureEvent(output[0], event, false, user);
      checkSummaryEvent(output[1]);
      done();
    });
  });

  it('filters user in feature event', done => {
    const config = { allAttributesPrivate: true, inlineUsersInEvents: true };
    const ep = EventProcessor(eventsUrl, config, null, mockEventSender);
    const event = {
      kind: 'feature',
      creationDate: 1000,
      key: 'flagkey',
      user: user,
      trackEvents: true,
    };
    ep.enqueue(event);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      checkFeatureEvent(output[0], event, false, filteredUser);
      checkSummaryEvent(output[1]);
      done();
    });
  });

  it('sets event kind to debug if event is temporarily in debug mode', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const futureTime = new Date().getTime() + 1000000;
    const e = {
      kind: 'feature',
      creationDate: 1000,
      user: user,
      key: 'flagkey',
      version: 11,
      variation: 1,
      value: 'value',
      trackEvents: false,
      debugEventsUntilDate: futureTime,
    };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      checkFeatureEvent(output[0], e, true, user);
      checkSummaryEvent(output[1]);
      done();
    });
  });

  it('can both track and debug an event', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const futureTime = new Date().getTime() + 1000000;
    const e = {
      kind: 'feature',
      creationDate: 1000,
      user: user,
      key: 'flagkey',
      version: 11,
      variation: 1,
      value: 'value',
      trackEvents: true,
      debugEventsUntilDate: futureTime,
    };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(3);
      checkFeatureEvent(output[0], e, false);
      checkFeatureEvent(output[1], e, true, user);
      checkSummaryEvent(output[2]);
      done();
    });
  });

  it('expires debug mode based on client time if client time is later than server time', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);

    // Pick a server time that is somewhat behind the client time
    const serverTime = new Date().getTime() - 20000;
    mockEventSender.serverTime = serverTime;

    // Send and flush an event we don't care about, just to set the last server time
    ep.enqueue({ kind: 'identify', user: { key: 'otherUser' } });
    ep.flush().then(() => {
      // Now send an event with debug mode on, with a "debug until" time that is further in
      // the future than the server time, but in the past compared to the client.
      const debugUntil = serverTime + 1000;
      const e = {
        kind: 'feature',
        creationDate: 1000,
        user: user,
        key: 'flagkey',
        version: 11,
        variation: 1,
        value: 'value',
        trackEvents: false,
        debugEventsUntilDate: debugUntil,
      };
      ep.enqueue(e);

      // Should get a summary event only, not a full feature event
      ep.flush().then(() => {
        expect(mockEventSender.calls.length).toEqual(2);
        const output = mockEventSender.calls[1].events;
        expect(output.length).toEqual(1);
        checkSummaryEvent(output[0]);
        done();
      });
    });
  });

  it('expires debug mode based on server time if server time is later than client time', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);

    // Pick a server time that is somewhat ahead of the client time
    const serverTime = new Date().getTime() + 20000;
    mockEventSender.serverTime = serverTime;

    // Send and flush an event we don't care about, just to set the last server time
    ep.enqueue({ kind: 'identify', user: { key: 'otherUser' } });
    ep.flush().then(() => {
      // Now send an event with debug mode on, with a "debug until" time that is further in
      // the future than the client time, but in the past compared to the server.
      const debugUntil = serverTime - 1000;
      const e = {
        kind: 'feature',
        creationDate: 1000,
        user: user,
        key: 'flagkey',
        version: 11,
        variation: 1,
        value: 'value',
        trackEvents: false,
        debugEventsUntilDate: debugUntil,
      };
      ep.enqueue(e);

      // Should get a summary event only, not a full feature event
      ep.flush().then(() => {
        expect(mockEventSender.calls.length).toEqual(2);
        const output = mockEventSender.calls[1].events;
        expect(output.length).toEqual(1);
        checkSummaryEvent(output[0]);
        done();
      });
    });
  });

  it('summarizes nontracked events', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    function makeEvent(key, date, version, variation, value, defaultVal) {
      return {
        kind: 'feature',
        creationDate: date,
        user: user,
        key: key,
        version: version,
        variation: variation,
        value: value,
        default: defaultVal,
        trackEvents: false,
      };
    }
    const e1 = makeEvent('flagkey1', 1000, 11, 1, 'value1', 'default1');
    const e2 = makeEvent('flagkey2', 2000, 22, 1, 'value2', 'default2');
    ep.enqueue(e1);
    ep.enqueue(e2);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(1);
      const se = output[0];
      checkSummaryEvent(se);
      expect(se.startDate).toEqual(1000);
      expect(se.endDate).toEqual(2000);
      expect(se.features).toEqual({
        flagkey1: {
          default: 'default1',
          counters: [{ version: 11, value: 'value1', count: 1 }],
        },
        flagkey2: {
          default: 'default2',
          counters: [{ version: 22, value: 'value2', count: 1 }],
        },
      });
      done();
    });
  });

  it('queues custom event', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const e = {
      kind: 'custom',
      creationDate: 1000,
      user: user,
      key: 'eventkey',
      data: { thing: 'stuff' },
    };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(1);
      checkCustomEvent(output[0], e);
      done();
    });
  });

  it('can include inline user in custom event', done => {
    const config = { inlineUsersInEvents: true };
    const ep = EventProcessor(eventsUrl, config, null, mockEventSender);
    const e = {
      kind: 'custom',
      creationDate: 1000,
      user: user,
      key: 'eventkey',
      data: { thing: 'stuff' },
    };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(1);
      checkCustomEvent(output[0], e, user);
      done();
    });
  });

  it('filters user in custom event', done => {
    const config = { allAttributesPrivate: true, inlineUsersInEvents: true };
    const ep = EventProcessor(eventsUrl, config, null, mockEventSender);
    const e = {
      kind: 'custom',
      creationDate: 1000,
      user: user,
      key: 'eventkey',
      data: { thing: 'stuff' },
    };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(1);
      checkCustomEvent(output[0], e, filteredUser);
      done();
    });
  });

  it('sends nothing if there are no events to flush', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(0);
      done();
    });
  });

  it('stops sending events after a 401 error', done => {
    const ep = EventProcessor(eventsUrl, {}, null, mockEventSender);
    const e = { kind: 'identify', creationDate: 1000, user: user };
    ep.enqueue(e);
    mockEventSender.status = 401;
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      ep.enqueue(e);
      ep.flush().then(() => {
        expect(mockEventSender.calls.length).toEqual(1); // still the one from our first flush
        done();
      });
    });
  });
});
