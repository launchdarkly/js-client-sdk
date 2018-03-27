var EventSerializer = require('../EventSerializer');
var EventProcessor = require('../EventProcessor');

describe('EventProcessor', function() {
  var sandbox;
  var serializer = EventSerializer({});

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  })

  afterEach(function() {
    sandbox.restore();
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

    result = processor.flush(user, true);

    expect(result).to.be.false;
  });

  it('should flush synchronously', function(done) {
    var processor = EventProcessor('/fake-url', serializer);
    var user = {key: 'foo'};
    var event = {kind: 'identify', key: user.key};
    var result;
    
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);
    processor.enqueue(event);

    result = processor.flush(user);

    result.then(function() {
      // test will only pass if the promise resolves
      done();
    })
  });
})