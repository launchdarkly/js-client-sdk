module.exports = {
  invalidKey: function() {
    return 'Event key must be a string';
  },
  localStorageUnavailable: function() {
    return 'localStorage is unavailable';
  },
  unknownCustomEventKey: function(key) {
    return 'Custom event "' + key + '" does not exist';
  },
};
