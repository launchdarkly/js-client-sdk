import * as LDClient from '../index';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };

  beforeEach(() => {
    window.navigator.doNotTrack = undefined;
    window.navigator.msDoNotTrack = undefined;
    window.doNotTrack = undefined;
  });

  // Event generation in general is tested in a non-platform-specific way in ldclient-js-common.
  // The following tests just demonstrate that the common client calls our platform object when it
  // should.

  describe('event generation', () => {
    function stubEventProcessor() {
      const ep = { events: [] };
      ep.start = function() {};
      ep.flush = function() {};
      ep.stop = function() {};
      ep.enqueue = function(e) {
        ep.events.push(e);
      };
      return ep;
    }

    // This tests that the client calls our platform's getCurrentUrl() method.
    it('sends an event for track()', done => {
      const urlShouldBe = window.location.href; // we can't actually change this in a test
      const ep = stubEventProcessor();
      const client = LDClient.initialize(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };
      client.on('ready', () => {
        client.track('eventkey', data);

        expect(ep.events.length).toEqual(2);
        const trackEvent = ep.events[1];
        expect(trackEvent.kind).toEqual('custom');
        expect(trackEvent.key).toEqual('eventkey');
        expect(trackEvent.user).toEqual(user);
        expect(trackEvent.data).toEqual(data);
        expect(trackEvent.url).toEqual(urlShouldBe);
        done();
      });
    });

    // This tests that the client calls our platform's isDoNotTrack() method.
    it('does not send an event for track() if doNotTrack is set', done => {
      window.doNotTrack = 1;
      const ep = stubEventProcessor();
      const client = LDClient.initialize(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };
      client.on('ready', () => {
        client.track('eventkey', data);
        expect(ep.events.length).toEqual(0);
        done();
      });
    });
  });
});
