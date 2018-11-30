import * as errors from './errors';
import * as messages from './messages';
import * as utils from './utils';

export function validate(options, emitter, extraDefaults, logger) {
  const baseDefaults = {
    baseUrl: 'https://app.launchdarkly.com',
    streamUrl: 'https://clientstream.launchdarkly.com',
    eventsUrl: 'https://events.launchdarkly.com',
    sendEvents: true,
    sendLDHeaders: true,
    inlineUsersInEvents: false,
    allowFrequentDuplicateEvents: false,
    sendEventsOnlyForVariation: false,
    useReport: false,
    evaluationReasons: false,
    flushInterval: 2000,
    samplingInterval: 0,
    streamReconnectDelay: 1000,
    allAttributesPrivate: false,
    privateAttributeNames: [],
  };
  const defaults = utils.extend({}, baseDefaults, extraDefaults);

  const deprecatedOptions = {
    // eslint-disable-next-line camelcase
    all_attributes_private: 'allAttributesPrivate',
    // eslint-disable-next-line camelcase
    private_attribute_names: 'privateAttributeNames',
  };

  function checkDeprecatedOptions(config) {
    const opts = config;
    Object.keys(deprecatedOptions).forEach(oldName => {
      if (opts[oldName] !== undefined) {
        const newName = deprecatedOptions[oldName];
        logger.warn(messages.deprecated(oldName, newName));
        if (opts[newName] === undefined) {
          opts[newName] = opts[oldName];
        }
        delete opts[oldName];
      }
    });
  }

  function applyDefaults(config, defaults) {
    // This works differently from utils.extend() in that it *will* override a default value
    // if the provided value is explicitly set to null. This provides backward compatibility
    // since in the past we only used the provided values if they were truthy.
    const ret = utils.extend({}, config);
    Object.keys(defaults).forEach(name => {
      if (ret[name] === undefined || ret[name] === null) {
        ret[name] = defaults[name];
      }
    });
    return ret;
  }

  function reportArgumentError(message) {
    utils.onNextTick(() => {
      emitter && emitter.maybeReportError(new errors.LDInvalidArgumentError(message));
    });
  }

  let config = utils.extend({}, options || {});

  checkDeprecatedOptions(config);

  config = applyDefaults(config, defaults);

  if (isNaN(config.flushInterval) || config.flushInterval < 2000) {
    config.flushInterval = 2000;
    reportArgumentError('Invalid flush interval configured. Must be an integer >= 2000 (milliseconds).');
  }
  if (isNaN(config.samplingInterval) || config.samplingInterval < 0) {
    config.samplingInterval = 0;
    reportArgumentError('Invalid sampling interval configured. Sampling interval must be an integer >= 0.');
  }

  return config;
}
