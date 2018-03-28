var Stream = require('../Stream');
var mockEventSource = require('./mockEventSource');
var noop = function() {};

describe('Stream', function() {
  var baseUrl = 'https://example.com';
  var envName = 'testenv';
  var user = { key: 'me' };
  var encodedUser = 'eyJrZXkiOiJtZSJ9';
  var hash = '012345789abcde';

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, 'EventSource', mockEventSource.new);
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should not throw on EventSource when it does not exist', function() {
    window.EventSource = undefined;
    
    var stream = new Stream(baseUrl, envName);

    var connect = function() {
      stream.connect(noop);
    }

    expect(connect).to.not.throw(TypeError);
  });

  it('should not throw when calling disconnect without first calling connect', function() {
    var stream = new Stream(baseUrl, envName);

    var disconnect = function() {
      stream.disconnect(noop);
    }

    expect(disconnect).to.not.throw(TypeError);
  });

  it('connects to EventSource with eval stream URL by default', function() {
    var stream = new Stream(baseUrl, envName, null, false);
    stream.connect(user, {});

    expect(mockEventSource.connectedUrl).to.equal(baseUrl + '/eval/' + envName + '/' + encodedUser);
  });

  it('adds secure mode hash to URL if provided', function() {
    var stream = new Stream(baseUrl, envName, hash, false);
    stream.connect(user, {});

    expect(mockEventSource.connectedUrl).to.equal(baseUrl + '/eval/' + envName + '/' + encodedUser + '?h=' + hash);
  });

  it('falls back to ping stream URL if useReport is true', function() {
    var stream = new Stream(baseUrl, envName, hash, true);
    stream.connect(user, {});

    expect(mockEventSource.connectedUrl).to.equal(baseUrl + '/ping/' + envName);
  });

  it('sets event listeners', function() {
    var stream = new Stream(baseUrl, envName, hash, false);
    var fn1 = function() { return 0; };
    var fn2 = function() { return 1; };
    stream.connect(user, {
      birthday: fn1,
      anniversary: fn2
    });

    expect(mockEventSource.listeners['birthday']).to.equal(fn1);
    expect(mockEventSource.listeners['anniversary']).to.equal(fn2);
  });
});
