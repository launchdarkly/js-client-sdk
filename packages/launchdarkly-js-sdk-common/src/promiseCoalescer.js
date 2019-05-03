// This function allows a series of Promises to be coalesced such that only the most recently
// added one actually matters. For instance, if several HTTP requests are made to the same
// endpoint and we want to ensure that whoever made each one always gets the latest data, each
// can be passed to addPromise (on the same coalescer) and each caller can wait on the
// coalescer.resultPromise; all three will then receive the result (or error) from the *last*
// request, and the results of the first two will be discarded.
//
// The cancelFn callback, if present, will be called whenever an existing promise is being
// discarded. This can be used for instance to abort an HTTP request that's now obsolete.
//
// The finallyFn callback, if present, is called on completion of the whole thing. This is
// different from calling coalescer.resultPromise.finally() because it is executed before any
// other handlers. Its purpose is to tell the caller that this coalescer should no longer be used.

export default function promiseCoalescer(finallyFn) {
  let currentPromise;
  let currentCancelFn;
  let finalResolve;
  let finalReject;

  const coalescer = {};

  coalescer.addPromise = (p, cancelFn) => {
    currentPromise = p;
    currentCancelFn && currentCancelFn();
    currentCancelFn = cancelFn;

    p.then(
      result => {
        if (currentPromise === p) {
          finalResolve(result);
          finallyFn && finallyFn();
        }
      },
      error => {
        if (currentPromise === p) {
          finalReject(error);
          finallyFn && finallyFn();
        }
      }
    );
  };

  coalescer.resultPromise = new Promise((resolve, reject) => {
    finalResolve = resolve;
    finalReject = reject;
  });

  return coalescer;
}
