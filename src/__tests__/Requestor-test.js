var Requestor = require('../Requestor');

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

    requestor = Requestor('http://requestee', 'FAKE_ENV');
    requestor.fetchFlagSettings({key: 'user1'}, 'hash1', handleOne);
    requestor.fetchFlagSettings({key: 'user2'}, 'hash2', handleTwo);

    server.respondWith(function(req) {
      seq++;
      req.respond(200, {'Content-type': 'application/json'}, JSON.stringify({tag: seq}));
    });

    server.respond();

    expect(server.requests.length).to.equal(2);
    expect(handleOne.args[0]).to.eql(handleTwo.args[0]);
  });
});
