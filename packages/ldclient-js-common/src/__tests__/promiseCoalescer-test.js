import promiseCoalescer from '../promiseCoalescer';

describe('promiseCoalescer', () => {
  function instrumentedPromise() {
    let resolveFn, rejectFn;
    const p = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });
    p.resolve = resolveFn;
    p.reject = rejectFn;
    return p;
  }

  describe('with a single promise', () => {
    it('resolves', async () => {
      const c = promiseCoalescer();
      const p = instrumentedPromise();
      c.addPromise(p);
      p.resolve(3);
      const result = await c.resultPromise;
      expect(result).toEqual(3);
    });

    it('rejects', async () => {
      const c = promiseCoalescer();
      const p = instrumentedPromise();
      c.addPromise(p);
      p.reject(new Error('no'));
      await expect(c.resultPromise).rejects.toThrow('no');
    });

    it('does not call cancelFn', async () => {
      const fn = jest.fn();
      const c = promiseCoalescer();
      const p = instrumentedPromise();
      c.addPromise(p, fn);
      p.resolve(3);
      await c.resultPromise;
      expect(fn).not.toHaveBeenCalled();
    });

    it('calls finallyFn', async () => {
      const fn = jest.fn();
      const c = promiseCoalescer(fn);
      const p = instrumentedPromise();
      c.addPromise(p, fn);
      expect(fn).not.toHaveBeenCalled();
      p.resolve(3);
      await c.resultPromise;
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('with multiple promises', () => {
    it('resolves only from the last one', async () => {
      const c = promiseCoalescer();
      const p1 = instrumentedPromise();
      const p2 = instrumentedPromise();
      const p3 = instrumentedPromise();
      c.addPromise(p1);
      c.addPromise(p2);
      c.addPromise(p3);
      p2.resolve(2);
      p3.resolve(3);
      p1.resolve(1);
      const result = await c.resultPromise;
      expect(result).toEqual(3);
    });

    it('rejects only from the last one', async () => {
      const c = promiseCoalescer();
      const p1 = instrumentedPromise();
      const p2 = instrumentedPromise();
      const p3 = instrumentedPromise();
      c.addPromise(p1);
      c.addPromise(p2);
      c.addPromise(p3);
      p2.resolve(2);
      p3.reject(new Error('no'));
      p1.resolve(new Error('maybe'));
      await expect(c.resultPromise).rejects.toThrow('no');
    });

    it('calls cancelFn on all but the last', async () => {
      const fn1 = jest.fn();
      const fn2 = jest.fn();
      const fn3 = jest.fn();
      const c = promiseCoalescer();
      const p1 = instrumentedPromise();
      const p2 = instrumentedPromise();
      const p3 = instrumentedPromise();
      c.addPromise(p1, fn1);
      expect(fn1).not.toHaveBeenCalled();
      c.addPromise(p2, fn2);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).not.toHaveBeenCalled();
      c.addPromise(p3, fn3);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).not.toHaveBeenCalled();
      p2.resolve(2);
      p3.resolve(3);
      p1.resolve(1);
      await c.resultPromise;
      expect(fn3).not.toHaveBeenCalled();
    });

    it('calls finallyFn', async () => {
      const fn = jest.fn();
      const c = promiseCoalescer(fn);
      const p1 = instrumentedPromise();
      const p2 = instrumentedPromise();
      const p3 = instrumentedPromise();
      c.addPromise(p1);
      expect(fn).not.toHaveBeenCalled();
      c.addPromise(p2);
      expect(fn).not.toHaveBeenCalled();
      c.addPromise(p3);
      expect(fn).not.toHaveBeenCalled();
      p2.resolve(2);
      p3.resolve(3);
      p1.resolve(1);
      await c.resultPromise;
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
