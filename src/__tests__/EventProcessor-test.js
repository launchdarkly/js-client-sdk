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
    return Promise.resolve();
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockEventSender.calls = [];
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

  it('should warn about missing user on initial flush', () => {
    const warnSpy = sandbox.spy(console, 'warn');
    const processor = EventProcessor(eventsUrl, {}, mockEventSender);
    processor.flush(null);
    warnSpy.restore();
    expect(warnSpy.called).toEqual(true);
  });

  it('should flush asynchronously', () => {
    const processor = EventProcessor(eventsUrl, {}, mockEventSender);
    const event = { kind: 'identify', key: user.key };

    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.flush(user);

    expect(mockEventSender.calls.length).toEqual(1);
    expect(mockEventSender.calls[0].sync).toEqual(false);
  });

  it('should flush synchronously', () => {
    const processor = EventProcessor(eventsUrl, {}, mockEventSender);
    const user = { key: 'foo' };
    const event = { kind: 'identify', key: user.key };

    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.flush(user, true);

    expect(mockEventSender.calls.length).toEqual(1);
    expect(mockEventSender.calls[0].sync).toEqual(true);
  });

  it('should enqueue identify event', done => {
    const ep = EventProcessor(eventsUrl, {}, mockEventSender);
    const event = { kind: 'identify', creationDate: 1000, key: user.key, user: user };
    ep.enqueue(event);
    ep.flush(user, false).then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      expect(mockEventSender.calls[0].events).toEqual([event]);
      done();
    });
  });

  it('filters user in identify event', done => {
    const config = { allAttributesPrivate: true };
    const ep = EventProcessor(eventsUrl, config, mockEventSender);
    const event = { kind: 'identify', creationDate: 1000, key: user.key, user: user };
    ep.enqueue(event);
    ep.flush(user, false).then(() => {
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

  it('queues individual feature event', done => {
    const ep = EventProcessor(eventsUrl, {}, mockEventSender);
    const event = {
      kind: 'feature',
      creationDate: 1000,
      key: 'flagkey',
      user: user,
    };
    ep.enqueue(event);
    ep.flush(user, false).then(() => {
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
    const ep = EventProcessor(eventsUrl, config, mockEventSender);
    const event = {
      kind: 'feature',
      creationDate: 1000,
      key: 'flagkey',
      user: user,
    };
    ep.enqueue(event);
    ep.flush(user, false).then(() => {
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
    const ep = EventProcessor(eventsUrl, config, mockEventSender);
    const event = {
      kind: 'feature',
      creationDate: 1000,
      key: 'flagkey',
      user: user,
    };
    ep.enqueue(event);
    ep.flush(user, false).then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(2);
      checkFeatureEvent(output[0], event, false, filteredUser);
      checkSummaryEvent(output[1]);
      done();
    });
  });

  it('summarizes events', done => {
    const ep = EventProcessor(eventsUrl, {}, mockEventSender);
    const e1 = { kind: 'feature', creationDate: 1000, user: user, key: 'flagkey1',
      version: 11, variation: 1, value: 'value1', default: 'default1', trackEvents: false };
    const e2 = { kind: 'feature', creationDate: 2000, user: user, key: 'flagkey2',
      version: 22, variation: 1, value: 'value2', default: 'default2', trackEvents: false };
    ep.enqueue(e1);
    ep.enqueue(e2);
    ep.flush(user, false).then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(3);
      const se = output[2];
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

  it('queues custom event', done => {
    const ep = EventProcessor(eventsUrl, {}, mockEventSender);
    const e = { kind: 'custom', creationDate: 1000, user: user, key: 'eventkey',
      data: { thing: 'stuff' } };
    ep.enqueue(e);
    ep.flush(user, false).then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(1);
      checkCustomEvent(output[0], e);
      done();
    });
  });

  it('can include inline user in custom event', done => {
    const config = { inlineUsersInEvents: true };
    const ep = EventProcessor(eventsUrl, config, mockEventSender);
    const e = { kind: 'custom', creationDate: 1000, user: user, key: 'eventkey',
      data: { thing: 'stuff' } };
    ep.enqueue(e);
    ep.flush(user, false).then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(1);
      checkCustomEvent(output[0], e, user);
      done();
    });
  });

  it('filters user in custom event', done => {
    const config = { allAttributesPrivate: true, inlineUsersInEvents: true };
    const ep = EventProcessor(eventsUrl, config, mockEventSender);
    const e = { kind: 'custom', creationDate: 1000, user: user, key: 'eventkey',
      data: { thing: 'stuff' } };
    ep.enqueue(e);
    ep.flush(user, false).then(() => {
      expect(mockEventSender.calls.length).toEqual(1);
      const output = mockEventSender.calls[0].events;
      expect(output.length).toEqual(1);
      checkCustomEvent(output[0], e, filteredUser);
      done();
    });
  });

  it('sends nothing if there are no events to flush', () => {
    const processor = EventProcessor(eventsUrl, {}, mockEventSender);
    processor.flush(user, false);
    expect(mockEventSender.calls.length).toEqual(0);
  });
});
