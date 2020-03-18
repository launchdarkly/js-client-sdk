function isSyncXhrSupported() {
  // This is temporary logic to disable synchronous XHR in Chrome 73 and above. In all other browsers,
  // we will assume it is supported. See https://github.com/launchdarkly/js-client-sdk/issues/147
  const userAgent = window.navigator && window.navigator.userAgent;
  if (userAgent) {
    const chromeMatch = userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    if (chromeMatch) {
      const version = parseInt(chromeMatch[2], 10);
      return version < 73;
    }
  }
  return true;
}

const emptyResult = { promise: Promise.resolve({ status: 200, header: () => null, body: null }) };

export default function newHttpRequest(method, url, headers, body, pageIsClosing) {
  if (pageIsClosing) {
    // When the page is about to close, we have to use synchronous XHR (until we migrate to sendBeacon).
    // But not all browsers support this.
    if (!isSyncXhrSupported()) {
      return emptyResult;
      // Note that we return a fake success response, because we don't want the request to be retried in this case.
    }
  }

  const xhr = new window.XMLHttpRequest();
  xhr.open(method, url, !pageIsClosing);
  for (const key in headers || {}) {
    if (Object.prototype.hasOwnProperty.call(headers, key)) {
      xhr.setRequestHeader(key, headers[key]);
    }
  }
  if (pageIsClosing) {
    xhr.send(body); // We specified synchronous mode when we called xhr.open
    return emptyResult; // Again, we never want a request to be retried in this case, so we must say it succeeded.
  } else {
    let cancelled;
    const p = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (cancelled) {
          return;
        }
        resolve({
          status: xhr.status,
          header: key => xhr.getResponseHeader(key),
          body: xhr.responseText,
        });
      });
      xhr.addEventListener('error', () => {
        if (cancelled) {
          return;
        }
        reject(new Error());
      });
      xhr.send(body);
    });
    const cancel = () => {
      cancelled = true;
      xhr.abort();
    };
    return { promise: p, cancel: cancel };
  }
}
