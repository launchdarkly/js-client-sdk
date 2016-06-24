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
  
  for (var prop in oldObj) {
    if (oldObj.hasOwnProperty(prop)) {
      if (newObj[prop] !== oldObj[prop]) {
        mods[prop] = {previous: oldObj[prop], current: newObj[prop]};
      }
    }
  }
  
  return mods;
}

module.exports = {
  btoa: btoa,
  base64URLEncode: base64URLEncode,
  clone: clone,
  modifications: modifications
};
