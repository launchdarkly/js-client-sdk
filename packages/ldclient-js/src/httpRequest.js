const responseHeadersToCopy = ['date', 'content-type'];

function isSyncXhrSupported() {
  // This is temporary logic to disable synchronous XHR in Chrome 73 and above. In all other browsers,
  // we will assume it is supported. See https://github.com/launchdarkly/js-client/issues/147
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

export default function newHttpRequest(method, url, headers, body, pageIsClosing) {
  if (pageIsClosing) {
    // When the page is about to close, we have to use synchronous XHR (until we migrate to sendBeacon).
    // But not all browsers support this.
    if (!isSyncXhrSupported()) {
      return Promise.resolve();
    }
  }

  const xhr = new window.XMLHttpRequest();
  xhr.open(method, url, !pageIsClosing);
  for (const key in headers || {}) {
    if (headers.hasOwnProperty(key)) {
      xhr.setRequestHeader(key, headers[key]);
    }
  }
  if (pageIsClosing) {
    const p = new Promise(resolve => {
      xhr.send(body);
      resolve(); // no one will be able to chain from this promise anyway, but let's not leave it hanging
    });
    return { promise: p };
  } else {
    let cancelled;
    const p = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (cancelled) {
          return;
        }
        const headers = {};
        for (const i in responseHeadersToCopy) {
          const key = responseHeadersToCopy[i];
          const value = xhr.getResponseHeader(key);
          if (value !== null && value !== undefined) {
            headers[key] = value;
          }
        }
        resolve({
          status: xhr.status,
          headers: headers,
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
