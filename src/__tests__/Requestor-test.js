import Requestor from '../Requestor';

describe('Requestor', function() {
  var server;
  var seq = 0;

  beforeEach(function() {
    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
  });

  it('should always call the callback', function() {
    const handleOne = sinon.spy();
    const handleTwo = sinon.spy();

    requestor = new Requestor('http://requestee', 'FAKE_ENV');
    requestor.fetchFlagSettings({ key: 'user1' }, 'hash1', handleOne);
    requestor.fetchFlagSettings({ key: 'user2' }, 'hash2', handleTwo);

    server.respondWith(function(req) {
      seq++;
      req.respond(200, { 'Content-type': 'application/json' }, JSON.stringify({ tag: seq }));
    });

    server.respond();

    expect(server.requests.length).to.equal(2);
    expect(handleOne.args[0]).to.eql(handleTwo.args[0]);
  });

  it('should make requests with the GET verb if useReport is disabled', function() {
    requestor = Requestor('http://requestee', 'FAKE_ENV', false);

    requestor.fetchFlagSettings({ key: 'user1' }, 'hash1', sinon.spy());

    expect(server.requests.length).to.equal(1);
    expect(server.requests[0].method).to.equal('GET');
  });

  it('should make requests with the REPORT verb with a payload if useReport is enabled', function() {
    var user = { key: 'user1' };
    requestor = Requestor('http://requestee', 'FAKE_ENV', true);

    requestor.fetchFlagSettings(user, 'hash1', sinon.spy());

    expect(server.requests.length).to.equal(1);
    expect(server.requests[0].method).to.equal('REPORT');
    expect(server.requests[0].requestBody).to.equal(JSON.stringify(user));
  });

  it('should call the each callback at most once', function() {
    const handleOne = sinon.spy();
    const handleTwo = sinon.spy();
    const handleThree = sinon.spy();
    const handleFour = sinon.spy();
    const handleFive = sinon.spy();

    server.respondWith(function(req) {
      seq++;
      req.respond(200, { 'Content-type': 'application/json' }, JSON.stringify({ tag: seq }));
    });

    requestor = new Requestor('http://requestee', 'FAKE_ENV');
    requestor.fetchFlagSettings({ key: 'user1' }, 'hash1', handleOne);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user2' }, 'hash2', handleTwo);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user3' }, 'hash3', handleThree);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user4' }, 'hash4', handleFour);
    server.respond();
    requestor.fetchFlagSettings({ key: 'user5' }, 'hash5', handleFive);
    server.respond();

    expect(server.requests.length).to.equal(5);
    expect(handleOne.calledOnce).to.be.true;
    expect(handleTwo.calledOnce).to.be.true;
    expect(handleThree.calledOnce).to.be.true;
    expect(handleFour.calledOnce).to.be.true;
    expect(handleFive.calledOnce).to.be.true;
  });

  it('should log an error when an invalid environment key is specified', function() {
    const handleOne = sinon.spy();

    requestor = Requestor('http://requestee', 'FAKE_ENV');
    requestor.fetchFlagSettings({ key: 'user1' }, 'hash1', handleOne);

    server.respondWith(function(req) {
      seq++;
      req.respond(404);
    });
    var errorSpy = sinon.spy(console, 'error');
    server.respond();
    expect(
      errorSpy.calledWith(
        'Error fetching flag settings: environment not found. Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.'
      )
    ).to.be.true;
    errorSpy.restore();
  });
});
