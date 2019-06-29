import * as LDClient from '../index';

describe('LDClient', () => {
  const envName = 'UNKNOWN_ENVIRONMENT_ID';
  const user = { key: 'user' };

  beforeEach(() => {
    window.navigator.doNotTrack = undefined;
    window.navigator.msDoNotTrack = undefined;
    window.doNotTrack = undefined;
  });

  // Event generation in general is tested in a non-platform-specific way in launchdarkly-js-sdk-common.
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
    it('sends an event for track()', async () => {
      const urlShouldBe = window.location.href; // we can't actually change this in a test
      const ep = stubEventProcessor();
      const client = LDClient.initialize(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };

      await client.waitForInitialization();
      client.track('eventkey', data);

      expect(ep.events.length).toEqual(2);
      const trackEvent = ep.events[1];
      expect(trackEvent.kind).toEqual('custom');
      expect(trackEvent.key).toEqual('eventkey');
      expect(trackEvent.user).toEqual(user);
      expect(trackEvent.data).toEqual(data);
      expect(trackEvent.url).toEqual(urlShouldBe);
    });

    // This tests that the client calls our platform's isDoNotTrack() method.
    it('does not send an event for track() if doNotTrack is set', async () => {
      window.doNotTrack = 1;
      const ep = stubEventProcessor();
      const client = LDClient.initialize(envName, user, { eventProcessor: ep, bootstrap: {} });
      const data = { thing: 'stuff' };

      await client.waitForInitialization();
      client.track('eventkey', data);

      expect(ep.events.length).toEqual(0);
    });

    it('can transform URL for track()', async () => {
      const suffix = '/foo';
      const urlShouldBe = window.location.href + suffix;
      const ep = stubEventProcessor();
      const client = LDClient.initialize(envName, user, {
        eventProcessor: ep,
        bootstrap: {},
        eventUrlTransformer: url => url + suffix,
      });
      await client.waitForInitialization();
      client.track('eventkey');

      expect(ep.events.length).toEqual(2);
      const trackEvent = ep.events[1];
      expect(trackEvent.kind).toEqual('custom');
      expect(trackEvent.key).toEqual('eventkey');
      expect(trackEvent.user).toEqual(user);
      expect(trackEvent.url).toEqual(urlShouldBe);
    });
  });
});
