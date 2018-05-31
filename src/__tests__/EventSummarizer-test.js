import EventSummarizer from '../EventSummarizer';

describe('EventSummarizer', () => {
  const user = { key: 'key1' };

  it('does nothing for identify event', () => {
    const es = EventSummarizer();
    const snapshot = es.getSummary();
    es.summarizeEvent({ kind: 'identify', creationDate: 1000, user: user });
    expect(es.getSummary()).toEqual(snapshot);
  });

  it('does nothing for custom event', () => {
    const es = EventSummarizer();
    const snapshot = es.getSummary();
    es.summarizeEvent({ kind: 'custom', creationDate: 1000, key: 'eventkey', user: user });
    expect(es.getSummary()).toEqual(snapshot);
  });

  it('sets start and end dates for feature events', () => {
    const es = EventSummarizer();
    const event1 = { kind: 'feature', creationDate: 2000, key: 'key', user: user };
    const event2 = { kind: 'feature', creationDate: 1000, key: 'key', user: user };
    const event3 = { kind: 'feature', creationDate: 1500, key: 'key', user: user };
    es.summarizeEvent(event1);
    es.summarizeEvent(event2);
    es.summarizeEvent(event3);
    const data = es.getSummary();

    expect(data.startDate).toEqual(1000);
    expect(data.endDate).toEqual(2000);
  });

  function makeEvent(key, version, variation, value, defaultVal) {
    return {
      kind: 'feature',
      creationDate: 1000,
      key: key,
      version: version,
      user: user,
      variation: variation,
      value: value,
      default: defaultVal,
    };
  }

  it('increments counters for feature events', () => {
    const es = EventSummarizer();
    const event1 = makeEvent('key1', 11, 1, 100, 111);
    const event2 = makeEvent('key1', 11, 2, 200, 111);
    const event3 = makeEvent('key2', 22, 1, 999, 222);
    const event4 = makeEvent('key1', 11, 1, 100, 111);
    const event5 = makeEvent('badkey', null, null, 333, 333);
    es.summarizeEvent(event1);
    es.summarizeEvent(event2);
    es.summarizeEvent(event3);
    es.summarizeEvent(event4);
    es.summarizeEvent(event5);
    const data = es.getSummary();

    data.features.key1.counters.sort((a, b) => a.value - b.value);
    const expectedFeatures = {
      key1: {
        default: 111,
        counters: [
          { value: 100, variation: 1, version: 11, count: 2 },
          { value: 200, variation: 2, version: 11, count: 1 },
        ],
      },
      key2: {
        default: 222,
        counters: [{ value: 999, variation: 1, version: 22, count: 1 }],
      },
      badkey: {
        default: 333,
        counters: [{ value: 333, unknown: true, count: 1 }],
      },
    };
    expect(data.features).toEqual(expectedFeatures);
  });

  it('distinguishes between zero and null/undefined in feature variation', () => {
    const es = EventSummarizer();
    const event1 = makeEvent('key1', 11, 0, 100, 111);
    const event2 = makeEvent('key1', 11, null, 111, 111);
    const event3 = makeEvent('key1', 11, undefined, 111, 111);
    es.summarizeEvent(event1);
    es.summarizeEvent(event2);
    es.summarizeEvent(event3);
    const data = es.getSummary();

    data.features.key1.counters.sort((a, b) => a.value - b.value);
    const expectedFeatures = {
      key1: {
        default: 111,
        counters: [{ variation: 0, value: 100, version: 11, count: 1 }, { value: 111, version: 11, count: 2 }],
      },
    };
    expect(data.features).toEqual(expectedFeatures);
  });
});
