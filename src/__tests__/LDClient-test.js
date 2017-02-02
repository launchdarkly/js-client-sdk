var LDClient = require('../index');
var semverCompare = require('semver-compare');

describe('LDClient', function() {
  var xhr;
  var requests = [];
  var sandbox;
  var store = {};

  var lsKey = 'ld:UNKNOWN_ENVIRONMENT_ID:user';
  
  
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
    it('should trigger the ready event', function(done) {
      var user = {key: 'user'};
      var handleReady = sinon.spy();
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}
      });
      
      client.on('ready', handleReady);
      
      setTimeout(function() {
        expect(handleReady.called).to.be.true;
        done();
      }, 0);
    });
    
    it('should not fetch flag settings since bootstrap is provided', function() {
      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
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
      var user = {key: 'user'};
      var client;

      window.localStorage.setItem(lsKey, 'foo{bar}');

      client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage'
      });

      client.on('ready', function() {
        expect(window.localStorage.getItem(lsKey)).to.be.null;
        done();
      });
    });
    
    it('should not clear cached settings if they are valid JSON', function(done) {
      var json = '{"enable-thing": true}';
      var user = {key: 'user'};
      var client;

      window.localStorage.setItem(lsKey, json);

      client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: 'localstorage'
      });

      client.on('ready', function() {
        expect(window.localStorage.getItem(lsKey)).to.equal(json);
        done();
      });
    });

    it('should not update cached settings if there was an error fetching flags', function(done) {
      var user = {key: 'user'};
      var json = '{"enable-foo": true}';

      window.localStorage.setItem(lsKey, json);

      var server = sinon.fakeServer.create();
      server.respondWith(function(req) {
        req.respond(503);
      });

      client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
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
  });
  
});
