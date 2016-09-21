var LDClient = require('../index');
var semverCompare = require('semver-compare');

describe('LDClient', function() {
  var xhr;
  var requests = [];

  beforeEach(function() {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(req) {
      requests.push(req);
    };
  });

  afterEach(function() {
    requests = [];
    xhr.restore();
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
  });

  describe('variation', function() {
    it('should return value for specified dashed-separated key', function(done) {
      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'this-is-a-test-key': true}
      });

      client.on('ready', function(){
        var dashedKey = 'this-is-a-test-key';
        var flagValue = client.variation(dashedKey, false);
        expect(flagValue).to.be.true;
        done();
      });
    });

    it.only('should return value for specified camelCased key', function(done) {
      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'this-is-a-test-key': true}
      });

      client.on('ready', function(){
        var camelCasedKey = 'thisIsATestKey'; // this fails, it becomes this-is-atest
        var flagValue = client.variation(camelCasedKey, false);
        expect(flagValue).to.be.true;
        done();
      });
    });
  });

});
