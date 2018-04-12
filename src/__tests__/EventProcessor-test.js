import sinon from 'sinon';

import EventProcessor from '../EventProcessor';

describe('EventProcessor', () => {
  let sandbox;
  let warnSpy;
  const mockEventSender = {};
  const user = { key: 'userKey', name: 'Red' };
  const filteredUser = { key: 'userKey', privateAttrs: [ 'name' ] };
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

  function checkIndexEvent(e, source, user) {
    expect(e.kind).toEqual('index');
    expect(e.creationDate).toEqual(source.creationDate);
    expect(e.user).toEqual(user);
  }

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
    const processor = EventProcessor({}, eventsUrl, null, mockEventSender);
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
    const processor = EventProcessor({}, eventsUrl, null, mockEventSender);
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
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);
    const event = { kind: 'identify', creationDate: 1000, key: user.key, user: user };
    ep.enqueue(event);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      expect(mockEventSender.calls[0].events).toEqual([event]);
      done();
    });
  });

  it('filters user in identify event', done => {
    const config = { all_attributes_private: true };
    const ep = EventProcessor(config, eventsUrl, null, mockEventSender);
    const event = { kind: 'identify', creationDate: 1000, key: user.key, user: user };
    ep.enqueue(event);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      expect(mockEventSender.calls[0].events).toEqual([{
        kind: 'identify',
        creationDate: event.creationDate,
        key: user.key,
        user: filteredUser,
      }]);
      done();
    });
  });

  it('queues individual feature event with index event', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);
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
      expect(output.length).toEqual(3);
      checkIndexEvent(output[0], event, user);
      checkFeatureEvent(output[1], event, false);
      checkSummaryEvent(output[2]);
      done();
    });
  });

  it('filters user in index event', done => {
    const config = { all_attributes_private: true };
    const ep = EventProcessor(config, eventsUrl, null, mockEventSender);
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
      expect(output.length).toEqual(3);
      checkIndexEvent(output[0], event, filteredUser);
      checkFeatureEvent(output[1], event, false);
      checkSummaryEvent(output[2]);
      done();
    });
  });

  it('can include inline user in feature event', done => {
    const config = { inlineUsersInEvents: true };
    const ep = EventProcessor(config, eventsUrl, null, mockEventSender);
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
    const config = { all_attributes_private: true, inlineUsersInEvents: true };
    const ep = EventProcessor(config, eventsUrl, null, mockEventSender);
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

  it('still generates index event if inline_users is true but feature event is not tracked', done => {
    const config = { inlineUsersInEvents: true };
    const ep = EventProcessor(config, eventsUrl, null, mockEventSender);
    const e = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey',
      version: 11, variation: 1, value: 'value', trackEvents: false };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      checkIndexEvent(output[0], e, user);
      checkSummaryEvent(output[1]);
      done();
    });
  });

  it('sets event kind to debug if event is temporarily in debug mode', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);
    const futureTime = new Date().getTime() + 1000000;
    const e = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey',
      version: 11, variation: 1, value: 'value', trackEvents: false, debugEventsUntilDate: futureTime };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(3);
      checkIndexEvent(output[0], e, user);
      checkFeatureEvent(output[1], e, true, user);
      checkSummaryEvent(output[2]);
      done();
    });
  });

  it('can both track and debug an event', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);
    const futureTime = new Date().getTime() + 1000000;
    const e = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey',
      version: 11, variation: 1, value: 'value', trackEvents: true, debugEventsUntilDate: futureTime };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(4);
      checkIndexEvent(output[0], e, user);
      checkFeatureEvent(output[1], e, false);
      checkFeatureEvent(output[2], e, true, user);
      checkSummaryEvent(output[3]);
      done();
    });
  });

  it('expires debug mode based on client time if client time is later than server time', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);

    // Pick a server time that is somewhat behind the client time
    const serverTime = new Date().getTime() - 20000;
    mockEventSender.serverTime = serverTime;

    // Send and flush an event we don't care about, just to set the last server time
    ep.enqueue({ kind: 'identify', user: { key: 'otherUser' } });
    ep.flush().then(() => {
      // Now send an event with debug mode on, with a "debug until" time that is further in
      // the future than the server time, but in the past compared to the client.
      const debugUntil = serverTime + 1000;
      const e = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey',
        version: 11, variation: 1, value: 'value', trackEvents: false, debugEventsUntilDate: debugUntil };
      ep.enqueue(e);

      // Should get a summary event only, not a full feature event
      ep.flush().then(() => {
        expect(mockEventSender.calls.length).toEqual(2);
        const output = mockEventSender.calls[1].events;
        expect(output.length).toEqual(2);
        checkIndexEvent(output[0], e, user);
        checkSummaryEvent(output[1]);
        done();
      });
    });
  });

  it('expires debug mode based on server time if server time is later than client time', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);

    // Pick a server time that is somewhat ahead of the client time
    const serverTime = new Date().getTime() + 20000;
    mockEventSender.serverTime = serverTime;

    // Send and flush an event we don't care about, just to set the last server time
    ep.enqueue({ kind: 'identify', user: { key: 'otherUser' } });
    ep.flush().then(() => {
      // Now send an event with debug mode on, with a "debug until" time that is further in
      // the future than the client time, but in the past compared to the server.
      const debugUntil = serverTime - 1000;
      const e = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey',
        version: 11, variation: 1, value: 'value', trackEvents: false, debugEventsUntilDate: debugUntil };
      ep.enqueue(e);

      // Should get a summary event only, not a full feature event
      ep.flush().then(() => {
        expect(mockEventSender.calls.length).toEqual(2);
        const output = mockEventSender.calls[1].events;
        expect(output.length).toEqual(2);
        checkIndexEvent(output[0], e, user);
        checkSummaryEvent(output[1]);
        done();
      });
    });
  });

  it('generates only one index event from two feature events for same user', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);
    const e1 = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey1',
      version: 11, value: 'value', trackEvents: true };
    const e2 = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey2',
      version: 11, value: 'value', trackEvents: true };
    ep.enqueue(e1);
    ep.enqueue(e2);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(4);
      checkIndexEvent(output[0], e1, user);
      checkFeatureEvent(output[1], e1, false);
      checkFeatureEvent(output[2], e2, false);
      checkSummaryEvent(output[3]);
      done();
    });
  });

  it('summarizes nontracked events', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);
    const e1 = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey1',
      version: 11, variation: 1, value: 'value1', default: 'default1', trackEvents: false };
    const e2 = { kind: 'feature', creationDate: 2000, user: user, key: 'flagkey2',
      version: 22, variation: 1, value: 'value2', default: 'default2', trackEvents: false };
    ep.enqueue(e1);
    ep.enqueue(e2);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      const se = output[1];
      checkSummaryEvent(se);
      expect(se.startDate).toEqual(1000);
      expect(se.endDate).toEqual(2000);
      expect(se.features).toEqual({
        flagkey1: {
          default: 'default1',
          counters: [ { version: 11, value: 'value1', count: 1 } ]
        },
        flagkey2: {
          default: 'default2',
          counters: [ { version: 22, value: 'value2', count: 1 } ]
        }
      });
      done();
    });
  });

  it('queues custom event with user', done => {
    const ep = EventProcessor({}, eventsUrl, null, mockEventSender);
    const e = { kind: 'custom', creationDate: 1000, user: user, key: 'eventkey',
      data: { thing: 'stuff' } };
    ep.enqueue(e);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      checkIndexEvent(output[0], e, user);
      checkCustomEvent(output[1], e);
      done();
    });
  });

  it('can include inline user in custom event', done => {
    const config = { inlineUsersInEvents: true };
    const ep = EventProcessor(config, eventsUrl, null, mockEventSender);
    const e = { kind: 'custom', creationDate: 1000, user: user, key: 'eventkey',
      data: { thing: 'stuff' } };
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
    const config = { all_attributes_private: true, inlineUsersInEvents: true };
    const ep = EventProcessor(config, eventsUrl, null, mockEventSender);
    const e = { kind: 'custom', creationDate: 1000, user: user, key: 'eventkey',
      data: { thing: 'stuff' } };
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
    const ep = EventProcessor({}, '/fake-url', null, mockEventSender);
    ep.flush().then(() => {
      expect(mockEventSender.calls.length).toEqual(0);
      done();
    });
  });

  it('stops sending events after a 401 error', done => {
    const ep = EventProcessor({}, '/fake-url', null, mockEventSender);
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
