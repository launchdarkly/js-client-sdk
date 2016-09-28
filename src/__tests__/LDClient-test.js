var rewire = require('rewire');
var semverCompare = require('semver-compare');
var LDClient = rewire('../index');

describe('LDClient', function () {
  var xhr;
  var requests = [];
  var onSubscribeChangeEvent = '';
  var unsubscribeChangeEvent = '';

  var eventEmitterMock = function EventEmitter() {
    var emitter = {};
    emitter.on = function (event) {
      onSubscribeChangeEvent = event;
    };
    emitter.off = function (event) {
      unsubscribeChangeEvent = event;
    };
    emitter.emit = function () {};
    return emitter;
  };

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function (req) {
      requests.push(req);
    };
  });

  afterEach(function () {
    requests = [];
    xhr.restore();
    onSubscribeChangeEvent = '';
    unsubscribeChangeEvent = '';
  });

  it('should exist', function () {
    expect(LDClient).to.exist;
  });

  describe('initialization', function () {
    it('should trigger the ready event', function (done) {
      var user = {key: 'user'};
      var handleReady = sinon.spy();
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {}
      });

      client.on('ready', handleReady);

      setTimeout(function () {
        expect(handleReady.called).to.be.true;
        done();
      }, 0);
    });

    it('should not fetch flag settings since bootstrap is provided', function () {
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

  describe('variation', function () {
    it('should return value for dashed-separated key', function (done) {
      const user = {key: 'user'};
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'this-is-a-test-key': 'protein', 'some-other-key': true}
      });

      client.on('ready', function () {
        const dashedKey = 'this-is-a-test-key';
        const flagValue = client.variation(dashedKey, false);
        expect(flagValue).to.eq('protein');
        done();
      });
    });

    it('should return value for camelCased key', function (done) {
      const user = {key: 'user'};
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'this-is-a-test-key': true, 'some-other-key': 'muscle'}
      });

      client.on('ready', function () {
        const camelCasedKey = 'thisIsATestKey';
        const flagValue = client.variation(camelCasedKey, false);
        expect(flagValue).to.be.true;
        done();
      });
    });

    it('should return default value for non-existent dashed key', function (done) {
      const user = {key: 'user'};
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'this-is-a-test-key': 'protein', 'some-other-key': 'bar'}
      });

      client.on('ready', function () {
        const defaultValue = 'cabbage';
        const key = 'does-not-exist';
        const flagValue = client.variation(key, defaultValue);
        expect(flagValue).to.eq(defaultValue);
        done();
      });
    });

    it('should return default value for non-existent camelCased key', function (done) {
      const user = {key: 'user'};
      const client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'this-is-a-test-key': 'protein', 'some-other-key': 'bar'}
      });

      client.on('ready', function () {
        const defaultValue = 'cabbage';
        const key = 'doesNotExist';
        const flagValue = client.variation(key, defaultValue);
        expect(flagValue).to.eq(defaultValue);
        done();
      });
    });
  });

  describe('subscribe to change event', function () {
    it('should correctly subscribe to change event using camelCasedKey', function (done) {
      var revertEventEmitter = LDClient.__set__("EventEmitter", eventEmitterMock);

      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'a-steak-will-be-nice': 'protein', 'some-other-key': true}
      });

      client.on('change:ASteakWillBeNice');
      expect(onSubscribeChangeEvent).to.eq('change:a-steak-will-be-nice');
      done();
    });

    it('should correctly subscribe to change event using dashed-key', function (done) {
      var revertEventEmitter = LDClient.__set__("EventEmitter", eventEmitterMock);

      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'lack-of-sleep': 'insomnia', 'protein-bar-is-good': true}
      });

      client.on('change:proteinBarIsGood');
      expect(onSubscribeChangeEvent).to.eq('change:protein-bar-is-good');
      done();
    });

    it('should default to passed event if flag does not exist', function (done) {
      var revertEventEmitter = LDClient.__set__("EventEmitter", eventEmitterMock);

      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'lack-of-sleep': 'insomnia', 'protein-bar-is-good': true}
      });

      client.on('change:IMissMyNutriBullet');
      expect(onSubscribeChangeEvent).to.eq('change:IMissMyNutriBullet');
      done();
    });
  });

  describe('unsubscribe change events', function () {
    it('should correctly unsubscribe camelCasedKey events', function (done) {
      var revertEventEmitter = LDClient.__set__("EventEmitter", eventEmitterMock);

      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'a-steak-will-be-nice': 'protein', 'some-other-key': true}
      });

      client.off('change:ASteakWillBeNice');
      expect(unsubscribeChangeEvent).to.eq('change:a-steak-will-be-nice');
      done();
    });

    it('should correctly unsubscribe dashed-key events', function (done) {
      var revertEventEmitter = LDClient.__set__("EventEmitter", eventEmitterMock);

      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'lack-of-sleep': 'insomnia', 'protein-bar-is-good': true}
      });

      client.off('change:proteinBarIsGood');
      expect(unsubscribeChangeEvent).to.eq('change:protein-bar-is-good');
      done();
    });

    it('should default to passed event if flag does not exist', function (done) {
      var revertEventEmitter = LDClient.__set__("EventEmitter", eventEmitterMock);

      var user = {key: 'user'};
      var client = LDClient.initialize('UNKNOWN_ENVIRONMENT_ID', user, {
        bootstrap: {'lack-of-sleep': 'insomnia', 'protein-bar-is-good': true}
      });

      client.off('change:IMissMyNutriBullet');
      expect(unsubscribeChangeEvent).to.eq('change:IMissMyNutriBullet');
      done();
    });
  });
});
