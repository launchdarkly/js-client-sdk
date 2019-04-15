import sinon from 'sinon';

export function asyncSleep(delay) {
  return new Promise(resolve => {
    setTimeout(resolve, delay);
  });
}

// asyncifyNodeStyle(callback => doSomething(..., callback)) returns a promise that will resolve or reject
export function asyncifyNodeStyle(f) {
  return new Promise((resolve, reject) => f((err, value) => (err ? reject(err) : resolve(value))));
}

export function errorResponse(status) {
  return [status, {}, ''];
}

export function jsonResponse(data) {
  return [200, { 'Content-Type': 'application/json' }, JSON.stringify(data)];
}

export function makeDefaultServer() {
  const server = sinon.createFakeServer();
  server.autoRespond = true;
  server.autoRespondAfter = 0;
  server.respondWith(jsonResponse({})); // default 200 response for tests that don't specify otherwise
  return server;
}

export const numericUser = {
  key: 1,
  secondary: 2,
  ip: 3,
  country: 4,
  email: 5,
  firstName: 6,
  lastName: 7,
  avatar: 8,
  name: 9,
  anonymous: false,
  custom: { age: 99 },
};

// This returns a Promise with a .callback property that is a plain callback function; when
// called, it will resolve the promise with either a single value or an array of arguments.
export function promiseListener() {
  let cb;
  const p = new Promise(resolve => {
    cb = function(value) {
      if (arguments.length > 1) {
        resolve(Array.prototype.slice.call(arguments));
      } else {
        resolve(value);
      }
    };
  });
  p.callback = cb;
  return p;
}

export const stringifiedNumericUser = {
  key: '1',
  secondary: '2',
  ip: '3',
  country: '4',
  email: '5',
  firstName: '6',
  lastName: '7',
  avatar: '8',
  name: '9',
  anonymous: false,
  custom: { age: 99 },
};

export function makeBootstrap(flagsData) {
  const ret = { $flagsState: {} };
  for (const key in flagsData) {
    const state = Object.assign({}, flagsData[key]);
    ret[key] = state.value;
    delete state.value;
    ret.$flagsState[key] = state;
  }
  return ret;
}
