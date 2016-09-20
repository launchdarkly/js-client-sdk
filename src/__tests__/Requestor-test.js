var Requestor = require('../Requestor');

describe('Requestor', function() {
  it('should always call the callback', function(done) {
    const handleOne = sinon.spy();
    const handleTwo = sinon.spy();
    requestor = Requestor('http://requestee', 'FAKE_ENV');

    requestor.fetchFlagSettings({key: 'user'}, 'hash', handleOne);
    requestor.fetchFlagSettings({key: 'user'}, 'hash', handleTwo);

    setTimeout(function() {
      expect(handleOne.called).to.be.true;
      expect(handleTwo.called).to.be.true;
      done();
    }, 300);
  });
});
