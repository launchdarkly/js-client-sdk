import * as configuration from '../configuration';
import EventEmitter from '../EventEmitter';

describe('configuration', function() {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  function checkDefault(name, defaultValue, specificValue) {
    it('applies defaults correctly for "' + name + "'", () => {
      const configWithUnspecifiedValue = {};
      expect(configuration.validate(configWithUnspecifiedValue)[name]).toBe(defaultValue);
      const configWithNullValue = {};
      configWithNullValue[name] = null;
      expect(configuration.validate(configWithNullValue)[name]).toBe(defaultValue);
      const configWithSpecifiedValue = {};
      configWithSpecifiedValue[name] = specificValue;
      expect(configuration.validate(configWithSpecifiedValue)[name]).toBe(specificValue);
    });
  }

  checkDefault('sendEvents', true, false);
  checkDefault('sendLDHeaders', true, false);
  checkDefault('fetchGoals', true, false);
  checkDefault('inlineUsersInEvents', false, true);
  checkDefault('allowFrequentDuplicateEvents', false, true);
  checkDefault('sendEventsOnlyForVariation', false, true);
  checkDefault('useReport', false, true);
  checkDefault('evaluationReasons', false, true);
  checkDefault('flushInterval', 2000, 3000);
  checkDefault('samplingInterval', 0, 1);
  checkDefault('streamReconnectDelay', 1000, 2000);

  function checkDeprecated(oldName, newName, value) {
    it('allows "' + oldName + '" as a deprecated equivalent to "' + newName + '"', function() {
      const config0 = {};
      config0[oldName] = value;
      var config1 = configuration.validate(config0);
      expect(config1[newName]).toBe(value);
      expect(config1[oldName]).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  }

  checkDeprecated('all_attributes_private', 'allAttributesPrivate', true);
  checkDeprecated('private_attribute_names', 'privateAttributeNames', ['foo']);

  function checkInvalidValue(name, badValue, goodValue, done) {
    const emitter = EventEmitter();
    emitter.on('error', e => {
      expect(e.constructor.prototype.name).toBe('LaunchDarklyInvalidArgumentError');
      done();
    });
    const config = {};
    config[name] = badValue;
    const config1 = configuration.validate(config, emitter);
    expect(config1[name]).toBe(goodValue);
  }

  it('enforces minimum flush interval', done => {
    checkInvalidValue('flushInterval', 1999, 2000, done);
  });

  it('disallows negative sampling interval', done => {
    checkInvalidValue('samplingInterval', -1, 0, done);
  });
});
