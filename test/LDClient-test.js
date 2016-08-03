var LDClient = require('../src/index');

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
  
  it('should be true', function() {
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
      
      console.log(requests);
      var settingsRequest = requests[0];
      expect(/sdk\/eval/.test(settingsRequest.url)).to.be.false;
    });
  });
  
});
