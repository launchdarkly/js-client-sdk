import assert from 'assert';
import wrapPromiseCallback from '../utils.js'

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
      const callback = sinon.spy();
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'), callback);

      promise.then(function(result) {
        expect(result).to.equal('woohoo');
        // callback run on next tick to maintain asynchronous expections
        setTimeout(function() {
          expect(callback.calledWith(null, 'woohoo')).to.be.true;
          done();
        }, 0);
      });
    });

    it('should call the callback with an error if the promise rejects', function(done) {
      const error = new Error('something went wrong');
      const callback = sinon.spy();
      const promise = wrapPromiseCallback(Promise.reject(error), callback);

      promise.catch(function(v) {
        expect(v).to.equal(error);
        // callback run on next tick to maintain asynchronous expections
        setTimeout(function() {
          expect(callback.calledWith(error, null)).to.be.true;
          done();
        }, 0);
      });
    });
  });
});
