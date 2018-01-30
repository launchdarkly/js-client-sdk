import semverCompare from 'semver-compare';

import LDClient from '../index';
import messages from '../messages';
import btoa from '../utils';

describe('LDClient', function() {
  var xhr;
  var requests = [];
  var sandbox;
  var store = {};
  var lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + btoa('{"key":"user"}');

  beforeEach(function() {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };

    sandbox = sinon.sandbox.create();
    sandbox.stub(window.localStorage.__proto__, 'setItem', function(k, v) {
      store[k] = v;
    });

    sandbox.stub(window.localStorage.__proto__, 'getItem', function(k) {
      return store[k];
    });
  });

  afterEach(function() {
    requests = [];
    xhr.restore();

    sandbox.restore();
  });

  it('should exist', function() {
    expect(LDClient).to.exist;
  });

  describe('initialization', function() {
    it('should resolve waitUntilReady promise when ready', function(done) {
      var user = { key: 'user' };
      var handleReady = sinon.spy();
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {},
      });
      client.waitUntilReady().then(handleReady);

      client.on('ready', function() {
        setTimeout(function() {
          expect(handleReady.called).to.be.true;
          done();
        }, 0);
      });
    });

    it('should log an error when initialize is called without an environment key', function(done) {
      var user = { key: 'user' };
      var errorSpy = sinon.spy(console, 'error');
      var client = LDClient.initialize('', user);
      expect(
        errorSpy.calledWith(
          'No environment specified. Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.'
        )
      ).to.be.true;
      errorSpy.restore();
      done();
    });

    it('should trigger the ready event', function(done) {
      var user = { key: 'user' };
      var handleReady = sinon.spy();
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {},
      });

      client.on('ready', handleReady);

      setTimeout(function() {
        expect(handleReady.called).to.be.true;
        done();
      }, 0);
    });

    it('should not fetch flag settings since bootstrap is provided', function() {
      var user = { key: 'user' };
      LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {},
      });

      var settingsRequest = requests[0];
      expect(/sdk\/eval/.test(settingsRequest.url)).to.be.false;
    });

    it('should contain package version', function() {
      // Arrange
      var version = LDClient.version;

      // Act: all client bundles above 1.0.7 should contain package version
      // https://github.com/substack/semver-compare
      var result = semverCompare(version, '1.0.6');

      // Assert
      expect(result).to.equal(1);
    });

    it('should clear cached settings if they are invalid JSON', function(done) {
      var user = { key: 'user' };
      var client;

      window.localStorage.setItem(lsKey, 'foo{bar}');

      client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', function() {
        expect(window.localStorage.getItem(lsKey)).to.be.null;
        done();
      });
    });

    it('should handle localStorage getItem throwing an exception', function(done) {
      sandbox.restore(window.localStorage.__proto__, 'getItem');
      sandbox.stub(window.localStorage.__proto__, 'getItem').throws();

      var warnSpy = sandbox.spy(console, 'warn');

      var user = { key: 'user' };
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', function() {
        expect(warnSpy.calledWith(messages.localStorageUnavailable())).to.be.true;
        done();
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');
    });

    it('should handle localStorage setItem throwing an exception', function(done) {
      sandbox.restore(window.localStorage.__proto__, 'setItem');
      sandbox.stub(window.localStorage.__proto__, 'setItem').throws();

      var user = { key: 'user' };
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      var warnSpy = sandbox.spy(console, 'warn');

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');

      client.on('ready', function() {
        expect(warnSpy.calledWith(messages.localStorageUnavailable())).to.be.true;
        done();
      });
    });

    it('should not update cached settings if there was an error fetching flags', function(done) {
      var user = { key: 'user' };
      var json = '{"enable-foo": true}';

      window.localStorage.setItem(lsKey, json);

      var server = sinon.fakeServer.create();
      server.respondWith(function(req) {
        req.respond(503);
      });
      client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', function() {
        expect(window.localStorage.getItem(lsKey)).to.equal(json);
        done();
      });
    });

    it('should not clear cached settings if they are valid JSON', function(done) {
      var json = '{"enable-thing": true}';
      var user = { key: 'user' };
      var client;

      window.localStorage.setItem(lsKey, json);
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      client.on('ready', function() {
        server.respond();
        setTimeout(function() {
          expect(window.localStorage.getItem(lsKey)).to.equal(json);
          done();
        }, 1);
      });
    });

    it('should use hash as localStorage key when secure mode is enabled', function(done) {
      var user = { key: 'user' };
      var lsKeyHash = 'ld:UNKNOWN_ENVIRONMENT_ID:totallyLegitHash';
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
        hash: 'totallyLegitHash',
      });

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '{"enable-foo": true}');

      client.on('ready', function() {
        expect(window.localStorage.getItem(lsKeyHash)).to.be.equal('{"enable-foo":true}');
        done();
      });
    });

    it('should clear localStorage when user context is changed', function(done) {
      var json = '{"enable-foo":true}';
      var lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + btoa('{"key":"user2"}');

      var user = { key: 'user' };
      var user2 = { key: 'user2' };
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage',
      });

      var server = sinon.fakeServer.create();
      server.respondWith([200, { 'Content-Type': 'application/json' }, json]);
      server.respondImmediately = true;

      client.on('ready', function() {
        client.identify(user2, null, function() {
          expect(window.localStorage.getItem(lsKey)).to.be.null;
          expect(window.localStorage.getItem(lsKey2)).to.equal(json);
          done();
        });
      });
    });

    it('should not warn when tracking an known custom goal event', function(done) {
      var user = { key: 'user' };
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}, // So the client doesn't request settings
      });

      var warnSpy = sinon.spy(console, 'warn');

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');

      client.on('ready', function() {
        client.track('known');
        expect(warnSpy.calledWith('Custom event key does not exist')).to.be.false;
        warnSpy.restore();
        done();
      });
    });

    it('should throw when tracking a non-string custom goal event', function(done) {
      var user = { key: 'user' };
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}, // So the client doesn't request settings
      });

      const track = function(key) {
        return function() {
          client.track(key);
        };
      };

      client.on('ready', function() {
        expect(track(123)).to.throw(messages.invalidKey());
        expect(track([])).to.throw(messages.invalidKey());
        expect(track({})).to.throw(messages.invalidKey());
        expect(track(null)).to.throw(messages.invalidKey());
        expect(track(undefined)).to.throw(messages.invalidKey());
        done();
      });
    });

    it('should warn when tracking an unknown custom goal event', function(done) {
      var user = { key: 'user' };
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}, // So the client doesn't request settings
      });

      var warnSpy = sinon.spy(console, 'warn');

      requests[0].respond(200, { 'Content-Type': 'application/json' }, '[{"key": "known", "kind": "custom"}]');

      client.on('ready', function() {
        client.track('unknown');
        expect(warnSpy.calledWith(messages.unknownCustomEventKey('unknown'))).to.be.true;
        warnSpy.restore();
        done();
      });
    });

    it('should emit an error event if there was an error fetching flags', function(done) {
      var user = { key: 'user' };

      var server = sinon.fakeServer.create();
      server.respondWith(function(req) {
        req.respond(503);
      });

      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user);

      var handleError = sinon.spy();
      client.on('error', handleError);
      server.respond();

      setTimeout(function() {
        expect(handleError.called).to.be.true;
        done();
      }, 0);
    });
  });
});
