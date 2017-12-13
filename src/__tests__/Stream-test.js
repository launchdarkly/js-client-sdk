import Stream from '../Stream';

var noop = function() {};

describe('Stream', function() {
  it('should not throw on EventSource when it does not exist', function() {
    window.EventSource = undefined;
    var stream = new Stream('https://example.com', 'test');

    var connect = function() {
      stream.connect(noop);
    };

    expect(connect).to.not.throw(TypeError);
  });
  it('should not throw when calling disconnect without first calling connect', function() {
    var stream = new Stream('https://example.com', 'test');

    var disconnect = function() {
      stream.disconnect(noop);
    };

    expect(disconnect).to.not.throw(TypeError);
  });
});
