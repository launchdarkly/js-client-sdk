const { commonBasicLogger } = require('launchdarkly-js-sdk-common');

function basicLogger(options) {
  return commonBasicLogger({ destination: console.log, ...options });
}

module.exports = {
  basicLogger,
};
