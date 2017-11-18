import Base64 from 'Base64';

// See http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
export function btoa(s) {
  return Base64.btoa(unescape(encodeURIComponent(s)));
}

export function base64URLEncode(s) {
  return btoa(s)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function modifications(oldObj, newObj) {
  var mods = {};
  if (!oldObj || !newObj) {
    return {};
  }
  for (var prop in oldObj) {
    if (oldObj.hasOwnProperty(prop)) {
      if (newObj[prop] !== oldObj[prop]) {
        mods[prop] = { previous: oldObj[prop], current: newObj[prop] };
      }
    }
  }

  return mods;
}
