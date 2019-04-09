const responseHeadersToCopy = ['date', 'content-type'];

export default function newHttpRequest(method, url, headers, body, synchronous) {
  const xhr = new window.XMLHttpRequest();
  xhr.open(method, url, !synchronous);
  for (const key in headers || {}) {
    if (headers.hasOwnProperty(key)) {
      xhr.setRequestHeader(key, headers[key]);
    }
  }
  if (synchronous) {
    const p = new Promise(resolve => {
      xhr.send(body);
      resolve();
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
