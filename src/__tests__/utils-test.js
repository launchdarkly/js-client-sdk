import sinon from 'sinon';
import { base64URLEncode, wrapPromiseCallback, chunkUserEventsForUrl } from '../utils';

describe('utils', () => {
  describe('wrapPromiseCallback', () => {
    it('should resolve to the value', done => {
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'));
      promise.then(value => {
        expect(value).toEqual('woohoo');
        done();
      });
    });

    it('should reject with the error', done => {
      const error = new Error('something went wrong');
      const promise = wrapPromiseCallback(Promise.reject(error));
      promise.catch(error => {
        expect(error).toEqual(error);
        done();
      });
    });

    it('should call the callback with a value if the promise resolves', done => {
      const callback = sinon.spy();
      const promise = wrapPromiseCallback(Promise.resolve('woohoo'), callback);

      promise.then(result => {
        expect(result).toEqual('woohoo');
        // callback run on next tick to maintain asynchronous expections
        setTimeout(() => {
          expect(callback.calledWith(null, 'woohoo')).toEqual(true);
          done();
        }, 0);
      });
    });

    it('should call the callback with an error if the promise rejects', done => {
      const error = new Error('something went wrong');
      const callback = sinon.spy();
      const promise = wrapPromiseCallback(Promise.reject(error), callback);

      promise.catch(v => {
        expect(v).toEqual(error);
        // callback run on next tick to maintain asynchronous expections
        setTimeout(() => {
          expect(callback.calledWith(error, null)).toEqual(true);
          done();
        }, 0);
      });
    });
  });

  describe('chunkUserEventsForUrl', () => {
    it('should properly chunk the list of events', () => {
      const user = { key: 'foo' };
      const event = { kind: 'identify', key: user.key };
      const eventLength = base64URLEncode(JSON.stringify(event)).length;
      const events = [event, event, event, event, event];
      const chunks = chunkUserEventsForUrl(eventLength * 2, events);
      expect(chunks).toEqual([[event, event], [event, event], [event]]);
    });
  });
});
