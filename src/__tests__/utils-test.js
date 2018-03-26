var assert = require('assert');
var wrapPromiseCallback = require('../utils.js').wrapPromiseCallback;

describe('utils', function() {
  describe('wrapPromiseCallback', function() {
    it('should resolve to the value', function(done) {
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'));
      promise.then(function(value) {
        expect(value).to.equal('woohoo');
        done();
      });
    });
  
    it('should reject with the error', function(done) {
      const error = new Error('something went wrong');
      const promise = wrapPromiseCallback(Promise.reject(error));
      promise.catch(function(error) {
        expect(error).to.equal(error);
        done();
      });
    });
  
    it('should call the callback with a value if the promise resolves', function(done) {
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'), function(error, value) {
        expect(promise).to.be.undefined;
        expect(error).to.be.null;
        expect(value).to.equal('woohoo');
        done();
      });
    });
  
    it('should call the callback with an error if the promise rejects', function(done) {
      const actualError = new Error('something went wrong');
      const promise = wrapPromiseCallback(Promise.reject(actualError), function(error, value) {
        expect(promise).to.be.undefined;
        expect(error).to.equal(actualError);
        expect(value).to.be.null;
        done();
      });
    });
  });
});