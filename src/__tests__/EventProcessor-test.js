var EventSerializer = require('../EventSerializer');
var EventProcessor = require('../EventProcessor');

describe('EventProcessor', function() {
  var sandbox;
  var xhr;
  var requests = [];
  var serializer = EventSerializer({});

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    requests = [];
    xhr = sinon.useFakeXMLHttpRequest();
    xhr.onCreate = function(xhr) {
      requests.push(xhr);
    };
  })

  afterEach(function() {
    sandbox.restore();
    xhr.restore();
  })

  it('should warn about missing user on initial flush', function() {
    var warnSpy = sandbox.spy(console, 'warn');
    var processor = EventProcessor('/fake-url', serializer);
    processor.flush(null);
    warnSpy.restore();
    expect(warnSpy.called).to.be.true;
  })

  it('should flush asynchronously', function() {
    var processor = EventProcessor('/fake-url', serializer);
    var user = {key: 'foo'};
    var event = {kind: 'identify', key: user.key};
    var result;
    
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);

    result = processor.flush(user);
    requests[0].respond();

    expect(requests.length).to.equal(1);
    expect(requests[0].async).to.be.true;
  });

  it('should flush synchronously', function() {
    var processor = EventProcessor('/fake-url', serializer);
    var user = {key: 'foo'};
    var event = {kind: 'identify', key: user.key};
    var result;
    
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);

    result = processor.flush(user, true);
    requests[0].respond();

    expect(requests.length).to.equal(1);
    expect(requests[0].async).to.be.false;
  });
})