module.exports ={
  invalidKey: 'Event key must be a string',
  unknownCustomEventKey: function(key) {
    return 'Custom event "' + key + '" does not exist'
  }
};
