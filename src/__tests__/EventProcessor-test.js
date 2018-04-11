import sinon from 'sinon';

import EventSerializer from '../EventSerializer';
import EventProcessor from '../EventProcessor';

describe('EventProcessor', () => {
  let sandbox;
  let xhr;
  let requests = [];
  let warnSpy;
  const serializer = EventSerializer({});

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    requests = [];
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(xhr) {
      requests.push(xhr);
    };
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    sandbox.restore();
    xhr.restore();
    warnSpy.mockRestore();
  });

  it('should warn about missing user on initial flush', () => {
    const warnSpy = sandbox.spy(console, 'warn');
    const processor = EventProcessor('/fake-url', serializer);
    processor.flush(null);
    warnSpy.restore();
    expect(warnSpy.called).toEqual(true);
  });

  it('should flush asynchronously', () => {
    const processor = EventProcessor('/fake-url', serializer);
    const user = { key: 'foo' };
    const event = { kind: 'identify', key: user.key };

    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.flush(user);
    requests[0].respond();

    expect(requests.length).toEqual(1);
    expect(requests[0].async).toEqual(true);
  });

  it('should flush synchronously', () => {
    const processor = EventProcessor('/fake-url', serializer);
    const user = { key: 'foo' };
    const event = { kind: 'identify', key: user.key };

    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.flush(user, true);
    requests[0].respond();

    expect(requests.length).toEqual(1);
    expect(requests[0].async).toEqual(false);
  });
});
