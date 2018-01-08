var assert = require('assert');
var EventSerializer = require('../EventSerializer.js');

describe('event_serializer', function() {

  // users to serialize
  var user = {
    'key': 'abc',
    'firstName': 'Sue',
    'custom': { 'bizzle': 'def', 'dizzle': 'ghi' }
  };

  var user_specifying_own_private_attr = {
    'key': 'abc',
    'firstName': 'Sue',
    'custom': { 'bizzle': 'def', 'dizzle': 'ghi' },
    'privateAttributeNames': [ 'dizzle', 'unused' ]
  };

  // expected results from serializing user
  var user_with_all_attrs_hidden = {
    'key': 'abc',
    'custom': { },
    'privateAttrs': [ 'bizzle', 'dizzle', 'firstName' ]
  };

  var user_with_some_attrs_hidden = {
    'key': 'abc',
    'custom': {
        'dizzle': 'ghi'
    },
    'privateAttrs': [ 'bizzle',  'firstName' ]
  };

  var user_with_own_specified_attr_hidden = {
    'key': 'abc',
    'firstName': 'Sue',
    'custom': {
      'bizzle': 'def'
    },
    'privateAttrs': [ 'dizzle' ]
  };

  function make_event(user) {
    return {
      'creationDate': 1000000,
      'key': 'xyz',
      'kind': 'thing',
      'user': user
    }
  }

  it('includes all user attributes by default', function() {
    var es = EventSerializer({});
    var event = make_event(user);
    assert.deepEqual(es.serialize_events([event]), [event]);
  });

  it('hides all except key if all_attrs_private is true', function() {
    var es = EventSerializer({ all_attributes_private: true});
    var event = make_event(user);
    assert.deepEqual(es.serialize_events([event]), [make_event(user_with_all_attrs_hidden)]);
  });

  it('hides some attributes if private_attr_names is set', function() {
    var es = EventSerializer({ private_attribute_names: [ 'firstName', 'bizzle' ]});
    var event = make_event(user);
    assert.deepEqual(es.serialize_events([event]), [make_event(user_with_some_attrs_hidden)]);
  });

  it('hides attributes specified in per-user privateAttrs', function() {
    var es = EventSerializer({});
    var event = make_event(user_specifying_own_private_attr);
    assert.deepEqual(es.serialize_events([event]), [make_event(user_with_own_specified_attr_hidden)]);
  });

  it('looks at both per-user privateAttrs and global config', function() {
    var es = EventSerializer({ private_attribute_names: [ 'firstName', 'bizzle' ]});
    var event = make_event(user_specifying_own_private_attr);
    assert.deepEqual(es.serialize_events([event]), [make_event(user_with_all_attrs_hidden)]);
  });
});
