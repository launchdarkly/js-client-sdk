var semverCompare = require('semver-compare');

var LDClient = require('../index');
var messages = require('../messages');
var errors = require('../errors');
var base64Encode = require('../utils').btoa;
var mockEventSource = require('./mockEventSource');

describe('LDClient', function() {
  var xhr;
  var requests = [];
  var sandbox;
  var store = {};

  var envName = 'UNKNOWN_ENVIRONMENT_ID';
  var lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:' + base64Encode('{"key":"user"}');
  var user = { key: 'user' };
  var encodedUser = 'eyJrZXkiOiJ1c2VyIn0';
  var hash = '012345789abcde';

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

    sandbox.stub(window, 'EventSource', mockEventSource.new);
  });

  afterEach(function() {
    requests = [];
    xhr.restore();

    sandbox.restore();
  });

  function getLastRequest() {
    return requests[requests.length - 1];
  }

  it('should exist', function() {
    expect(LDClient).to.exist;
  });

  describe('initialization', function() {
    it('should trigger the ready event', function(done) {
      var handleReady = sinon.spy();
      var client = LDClient.initialize(envName, user, {
        bootstrap: {}
      });

      client.on('ready', handleReady);

      setTimeout(function() {
        expect(handleReady.called).to.be.true;
        done();
      }, 0);
    });

    describe('waitUntilReady', function() {
      it('should resolve waitUntilReady promise when ready', function(done) {
        var handleReady = sinon.spy();
        var client = LDClient.initialize(envName, user, {
          bootstrap: {}
        });

        client.waitUntilReady().then(handleReady);

        client.on('ready', function() {
          setTimeout(function() {
            expect(handleReady.called).to.be.true;
            done();
          }, 0);
        });
      });

      it('should resolve waitUntilReady promise after ready event was already emitted', function(done) {
        var handleInitialReady = sinon.spy();
        var handleReady = sinon.spy();
        var client = LDClient.initialize(envName, user, {
          bootstrap: {}
        });

        client.on('ready', handleInitialReady);

        setTimeout(function () {
          client.waitUntilReady().then(handleReady);

          setTimeout(function () {
            expect(handleInitialReady.called).to.be.true;
            expect(handleReady.called).to.be.true;
            done();
          }, 0);
        }, 0);
      });
    });

    it('should emit an error when an invalid samplingInterval is specified', function(done) {
      var handleInitialReady = sinon.spy();
      var handleReady = sinon.spy();
      var client = LDClient.initialize(envName, user, {
        bootstrap: {},
        samplingInterval: "totally not a number"
      });

      client.on('error', function(err) {
        expect(err.message).to.be.equal('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
        done();
      });
    });

    it('should emit an error when initialize is called without an environment key', function(done) {
      var client = LDClient.initialize('', user,  {
        bootstrap: {}
      });
      client.on('error', function(err) {
        expect(err.message).to.be.equal(messages.environmentNotSpecified());
        done();
      });
    });

    it('should emit an error when an invalid environment key is specified', function() {
      var server = sinon.fakeServer.create();
      server.respondWith(function(req) {
        req.respond(404);
      });
      var client = LDClient.initialize('abc', user);
      server.respond();
      client.on('error', function(err) {
        expect(err.message).to.be.equal(messages.environmentNotFound());
        done();
      });
    })

    it('should not fetch flag settings since bootstrap is provided', function() {
      var client = LDClient.initialize(envName, user, {
        bootstrap: {}
      });

      var settingsRequest = requests[0];
      expect(/sdk\/eval/.test(settingsRequest.url)).to.be.false;
    });

    it('should contain package version', function () {
      // Arrange
      var version = LDClient.version;

      // Act: all client bundles above 1.0.7 should contain package version
      // https://github.com/substack/semver-compare
      var result = semverCompare(version, '1.0.6');

      // Assert
      expect(result).to.equal(1);
    });

    it('should clear cached settings if they are invalid JSON', function(done) {
      var client;

      window.localStorage.setItem(lsKey, 'foo{bar}');

      client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage'
      });

      client.on('ready', function() {
        expect(window.localStorage.getItem(lsKey)).to.be.null;
        done();
      });
    });

    it('should not clear cached settings if they are valid JSON', function(done) {
      var json = '{"enable-thing": true}';
      var client;

      window.localStorage.setItem(lsKey, json);

      client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage'
      });

      client.on('ready', function() {
        expect(window.localStorage.getItem(lsKey)).to.equal(json);
        done();
      });
    });

    it('should handle localStorage getItem throwing an exception', function(done) {
      sandbox.restore(window.localStorage.__proto__, 'getItem')
      sandbox.stub(window.localStorage.__proto__, 'getItem').throws()

      var warnSpy = sandbox.spy(console, 'warn');

      var client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage'
      });

      client.on('ready', function() {
        expect(warnSpy.calledWith(messages.localStorageUnavailable())).to.be.true;
        done();
      });

      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '[{"key": "known", "kind": "custom"}]'
      );

    });

    it('should handle localStorage setItem throwing an exception', function(done) {
      sandbox.restore(window.localStorage.__proto__, 'setItem')
      sandbox.stub(window.localStorage.__proto__, 'setItem').throws()

      var client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage'
      });

      var warnSpy = sandbox.spy(console, 'warn');

      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '[{"key": "known", "kind": "custom"}]'
      );

      client.on('ready', function() {
        expect(warnSpy.calledWith(messages.localStorageUnavailable())).to.be.true;
        done();
      });
    });

    it('should not update cached settings if there was an error fetching flags', function(done) {
      var json = '{"enable-foo": true}';

      window.localStorage.setItem(lsKey, json);

      var server = sinon.fakeServer.create();
      server.respondWith(function(req) {
        req.respond(503);
      });

      client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage'
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
      var lsKeyHash = 'ld:UNKNOWN_ENVIRONMENT_ID:totallyLegitHash';
      var client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage',
        hash: 'totallyLegitHash'
      });

      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '{"enable-foo": true}'
      );

      client.on('ready', function() {
        expect(JSON.parse(window.localStorage.getItem(lsKeyHash))).to.eql({"enable-foo":true});
        done();
      });
    });

    it('should clear localStorage when user context is changed', function(done) {
      var json = '{"enable-foo":true}';
      var lsKey2 = 'ld:UNKNOWN_ENVIRONMENT_ID:' + base64Encode('{"key":"user2"}');

      var user2 = {key: 'user2'};
      var client = LDClient.initialize(envName, user, {
        bootstrap: 'localstorage'
      });

      var server = sinon.fakeServer.create();
      server.respondWith(
        [200, {"Content-Type": "application/json"}, json]
      );

      client.on('ready', function() {
        client.identify(user2, null, function() {
          expect(window.localStorage.getItem(lsKey)).to.be.null;
          expect(JSON.parse(window.localStorage.getItem(lsKey2))).to.eql({"enable-foo":true});
          done();
        });
        server.respond();
      });
      server.respond();
    });

    it('should not warn when tracking a known custom goal event', function(done) {
      var client = LDClient.initialize(envName, user, {
        bootstrap: {} // so the client doesn't request settings
      });

      var warnSpy = sandbox.spy(console, 'warn');

      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '[{"key": "known", "kind": "custom"}]'
      );

      client.on('ready', function() {
        client.track('known');
        expect(warnSpy.calledWith('Custom event key does not exist')).to.be.false;
        done();
      });
    });

    it('should emit an error when tracking a non-string custom goal event', function(done) {
      var client = LDClient.initialize(envName, user, {
        bootstrap: {} // so the client doesn't request settings
      });
      var errorCount = 0;
      client.on('ready', function() {
        var errorSpy = sinon.spy(console, 'error');
        var badCustomEventKeys = [123, [], {}, null, undefined]
        badCustomEventKeys.forEach(function(key) {
          client.track(key);
          expect(errorSpy.calledWith(messages.unknownCustomEventKey(key))).to.be.true;
        })
        errorSpy.restore();
        done();
      });
    });

    it('should warn when tracking an unknown custom goal event', function(done) {
      var client = LDClient.initialize(envName, user, {
        bootstrap: {} // so the client doesn't request settings
      });

      var warnSpy = sandbox.spy(console, 'warn');

      requests[0].respond(
        200,
        { 'Content-Type': 'application/json' },
        '[{"key": "known", "kind": "custom"}]'
      );

      client.on('ready', function() {
        client.track('unknown');
        expect(warnSpy.calledWith(messages.unknownCustomEventKey('unknown'))).to.be.true;
        done();
      });
    });

    it('should emit an error event if there was an error fetching flags', function(done) {
      var server = sinon.fakeServer.create();
      server.respondWith(function(req) {
        req.respond(503);
      });

      client = LDClient.initialize(envName, user);

      var handleError = sinon.spy();
      client.on('error', handleError);
      server.respond();

      setTimeout(function() {
        expect(handleError.called).to.be.true;
        done();
      }, 0);
    });
  });

  describe('event listening', function() {
    var streamUrl = 'https://clientstream.launchdarkly.com';

    it('does not connect to the stream by default', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', function() {
        expect(mockEventSource.connectedUrl).to.equal(null);
        done();
      });
    });

    it('connects to the stream when listening to global change events', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', function() {
        client.on('change', function() { });

        expect(mockEventSource.connectedUrl).to.equal(streamUrl + '/eval/' + envName + '/' + encodedUser);
        done();
      });
    });

    it('connects to the stream when listening to change event for one flag', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', function() {
        client.on('change:flagkey', function() { });

        expect(mockEventSource.connectedUrl).to.equal(streamUrl + '/eval/' +
          envName + '/' + encodedUser);
        done();
      });
    });

    it('passes the secure mode hash in the stream URL if provided', function(done) {
      var client = LDClient.initialize(envName, user, { hash: hash, bootstrap: {} });

      client.on('ready', function() {
        client.on('change:flagkey', function() { });

        expect(mockEventSource.connectedUrl).to.equal(streamUrl + '/eval/' +
            envName + '/' + encodedUser + '?h=' + hash);
        done();
      });
    });

    it('handles stream ping message by getting flags', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', function() {
        client.on('change', function() { });

        mockEventSource.listeners['ping']();

        getLastRequest().respond( 200, { 'Content-Type': 'application/json' }, '{"enable-foo": true}');

        expect(client.variation('enable-foo')).to.equal(true);
        done();
      });
    });

    it('handles stream put message by updating flags', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', function() {
        client.on('change', function() { });

        mockEventSource.listeners['put']({
          data: '{"enable-foo":{"value":true,"version":1}}'
        });

        expect(client.variation('enable-foo')).to.equal(true);
        done();
      });
    });

    it('updates local storage for put message if using local storage', function(done) {
      window.localStorage.setItem(lsKey, '{"enable-foo":false}');
      var client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' });

      client.on('ready', function() {
        client.on('change', function() { });

        mockEventSource.listeners['put']({
          data: '{"enable-foo":{"value":true,"version":1}}'
        });

        expect(client.variation('enable-foo')).to.equal(true);
        expect(window.localStorage.getItem(lsKey)).to.equal('{"enable-foo":true}');
        done();
      });
    });

    it('fires global change event when flags are updated from put event', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', function() {
        client.on('change', function(changes) {
          expect(changes).to.deep.equal({
            'enable-foo': { current: true, previous: false }
          });

          done();
        });

        mockEventSource.listeners['put']({
          data: '{"enable-foo":{"value":true,"version":1}}'
        });
      });
    });

    it('fires individual change event when flags are updated from put event', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', function() {
        client.on('change:enable-foo', function(current, previous) {
          expect(current).to.equal(true);
          expect(previous).to.equal(false);

          done();
        });

        mockEventSource.listeners['put']({
          data: '{"enable-foo":{"value":true,"version":1}}'
        });
      });
    });

    it('handles patch message by updating flag', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', function() {
        client.on('change', function() { });

        mockEventSource.listeners['patch']({
          data: '{"key":"enable-foo","value":true,"version":1}'
        });

        expect(client.variation('enable-foo')).to.equal(true);
        done();
      });
    });

    it('updates local storage for patch message if using local storage', function(done) {
      window.localStorage.setItem(lsKey, '{"enable-foo":false}');
      var client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' });

      client.on('ready', function() {
        client.on('change', function() { });

        mockEventSource.listeners['put']({
          data: '{"enable-foo":{"value":true,"version":1}}'
        });

        expect(client.variation('enable-foo')).to.equal(true);
        expect(window.localStorage.getItem(lsKey)).to.equal('{"enable-foo":true}');
        done();
      });
    });

    it('fires global change event when flag is updated from patch event', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', function() {
        client.on('change', function(changes) {
          expect(changes).to.deep.equal({
            'enable-foo': { current: true, previous: false }
          });

          done();
        });

        mockEventSource.listeners['patch']({
          data: '{"key":"enable-foo","value":true,"version":1}'
        });
      });
    });

    it('fires individual change event when flag is updated from patch event', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', function() {
        client.on('change:enable-foo', function(current, previous) {
          expect(current).to.equal(true);
          expect(previous).to.equal(false);

          done();
        });

        mockEventSource.listeners['patch']({
          data: '{"key":"enable-foo","value":true,"version":1}'
        });
      });
    });

    it('fires global change event when flag is newly created from patch event', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { } });

      client.on('ready', function() {
        client.on('change', function(changes) {
          expect(changes).to.deep.equal({
            'enable-foo': { current: true }
          });

          done();
        });

        mockEventSource.listeners['patch']({
          data: '{"key":"enable-foo","value":true,"version":1}'
        });
      });
    });

    it('fires global change event when flag is newly created from patch event', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { } });

      client.on('ready', function() {
        client.on('change:enable-foo', function(current, previous) {
          expect(current).to.equal(true);
          expect(previous).to.equal(undefined);

          done();
        });

        mockEventSource.listeners['patch']({
          data: '{"key":"enable-foo","value":true,"version":1}'
        });
      });
    });

    it('handles delete message by deleting flag', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': false } });

      client.on('ready', function() {
        client.on('change', function() { });

        mockEventSource.listeners['delete']({
          data: '{"key":"enable-foo","version":1}'
        });

        expect(client.variation('enable-foo')).to.equal(undefined);
        done();
      });
    });

    it('fires global change event when flag is deleted', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': true } });

      client.on('ready', function() {
        client.on('change', function(changes) {
          expect(changes).to.deep.equal({
            'enable-foo': { previous: true }
          });

          done();
        });

        mockEventSource.listeners['delete']({
          data: '{"key":"enable-foo","version":1}'
        });
      });
    });

    it('fires individual change event when flag is deleted', function(done) {
      var client = LDClient.initialize(envName, user, { bootstrap: { 'enable-foo': true } });

      client.on('ready', function() {
        client.on('change:enable-foo', function(current, previous) {
          expect(current).to.equal(undefined);
          expect(previous).to.equal(true);

          done();
        });

        mockEventSource.listeners['delete']({
          data: '{"key":"enable-foo","version":1}'
        });
      });
    });

    it('updates local storage for delete message if using local storage', function(done) {
      window.localStorage.setItem(lsKey, '{"enable-foo":false}');
      var client = LDClient.initialize(envName, user, { bootstrap: 'localstorage' });

      client.on('ready', function() {
        client.on('change', function() { });

        mockEventSource.listeners['delete']({
          data: '{"key":"enable-foo","version":1}'
        });

        expect(client.variation('enable-foo')).to.equal(undefined);
        expect(window.localStorage.getItem(lsKey)).to.equal('{}');
        done();
      });
    });

    it('reconnects to stream if the user changes', function(done) {
      var user2 = { key: 'user2' };
      var encodedUser2 = 'eyJrZXkiOiJ1c2VyMiJ9';
      var client = LDClient.initialize(envName, user, { bootstrap: {} });

      client.on('ready', function() {
        client.on('change', function() { });

        expect(mockEventSource.connectedUrl).to.equal(streamUrl + '/eval/' +
          envName + '/' + encodedUser);
        
        client.identify(user2, null, function() {
          expect(mockEventSource.connectedUrl).to.equal(streamUrl + '/eval/' +
            envName + '/' + encodedUser2);
          done();
        });

        getLastRequest().respond( 200, { 'Content-Type': 'application/json' }, '{"enable-foo": true}');
      });
    });
  });
});
