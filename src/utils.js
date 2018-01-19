var Base64 = require('Base64');

// See http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
function btoa(s) {
  return Base64.btoa(unescape(encodeURIComponent(s)));
}

function base64URLEncode(s) {
  return btoa(s)
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function modifications(oldObj, newObj) {
  var mods = {};
  if (!oldObj || !newObj) { return {}; }
  for (var prop in oldObj) {
    if (oldObj.hasOwnProperty(prop)) {
      if (newObj[prop] !== oldObj[prop]) {
        mods[prop] = {previous: oldObj[prop], current: newObj[prop]};
      }
    }
  }
  
  return mods;
}

// Based off of https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
function merge(target, varArgs) { // .length of function is 2
  'use strict';
  
  if (target == null) { // TypeError if undefined or null
    throw new TypeError('Cannot convert undefined or null to object');
  }

  var to = Object(target);

  for (var index = 1; index < arguments.length; index++) {
    var nextSource = arguments[index];

    if (nextSource != null) { // Skip over if undefined or null
      for (var nextKey in nextSource) {
        // Avoid bugs when hasOwnProperty is shadowed
        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
          to[nextKey] = nextSource[nextKey];
        }
      }
    }
  }
  return to;
}

module.exports = {
  btoa: btoa,
  base64URLEncode: base64URLEncode,
  clone: clone,
  modifications: modifications,
  merge: merge
};
