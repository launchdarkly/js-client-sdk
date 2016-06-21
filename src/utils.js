function fromBase64(base64string) {
  return base64string
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64URLEncode(stringOrBuffer, encoding) {
  return fromBase64(Buffer(stringOrBuffer, encoding).toString('base64'));
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
  base64URLEncode: base64URLEncode,
  clone: clone,
  modifications: modifications
};
