function fromBase64(base64string) {
  return (
    base64string
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
  );
}

exports.base64URLEncode = function(stringOrBuffer, encoding) {
  return fromBase64(Buffer(stringOrBuffer, encoding).toString('base64'));
}
