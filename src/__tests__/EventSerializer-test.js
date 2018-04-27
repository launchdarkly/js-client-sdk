import EventSerializer from '../EventSerializer.js';

describe('EventSerializer', () => {
  // users to serialize
  const user = {
    key: 'abc',
    firstName: 'Sue',
    custom: { bizzle: 'def', dizzle: 'ghi' },
  };

  const userSpecifyingOwnPrivateAttr = {
    key: 'abc',
    firstName: 'Sue',
    custom: { bizzle: 'def', dizzle: 'ghi' },
    privateAttributeNames: ['dizzle', 'unused'],
  };

  const userWithUnknownTopLevelAttrs = {
    key: 'abc',
    firstName: 'Sue',
    species: 'human',
    hatSize: 6,
    custom: { bizzle: 'def', dizzle: 'ghi' },
  };

  const anonUser = {
    key: 'abc',
    anonymous: true,
    custom: { bizzle: 'def', dizzle: 'ghi' },
  };

  // expected results from serializing user
  const userWithAllAttrsHidden = {
    key: 'abc',
    custom: {},
    privateAttrs: ['bizzle', 'dizzle', 'firstName'],
  };

  const userWithSomeAttrsHidden = {
    key: 'abc',
    custom: {
      dizzle: 'ghi',
    },
    privateAttrs: ['bizzle', 'firstName'],
  };

  const userWithOwnSpecifiedAttrHidden = {
    key: 'abc',
    firstName: 'Sue',
    custom: {
      bizzle: 'def',
    },
    privateAttrs: ['dizzle'],
  };

  const anonUserWithAllAttrsHidden = {
    key: 'abc',
    anonymous: true,
    custom: {},
    privateAttrs: ['bizzle', 'dizzle'],
  };

  function makeEvent(user) {
    return {
      creationDate: 1000000,
      key: 'xyz',
      kind: 'thing',
      user: user,
    };
  }

  it('includes all user attributes by default', () => {
    const es = EventSerializer({});
    const event = makeEvent(user);
    expect(es.serializeEvents([event])).toEqual([event]);
  });

  it('hides all except key if all_attrs_private is true', () => {
    // eslint-disable-next-line camelcase
    const es = EventSerializer({ all_attributes_private: true });
    const event = makeEvent(user);
    expect(es.serializeEvents([event])).toEqual([makeEvent(userWithAllAttrsHidden)]);
  });

  it('hides some attributes if private_attr_names is set', () => {
    // eslint-disable-next-line camelcase
    const es = EventSerializer({ private_attribute_names: ['firstName', 'bizzle'] });
    const event = makeEvent(user);
    expect(es.serializeEvents([event])).toEqual([makeEvent(userWithSomeAttrsHidden)]);
  });

  it('hides attributes specified in per-user privateAttrs', () => {
    const es = EventSerializer({});
    const event = makeEvent(userSpecifyingOwnPrivateAttr);
    expect(es.serializeEvents([event])).toEqual([makeEvent(userWithOwnSpecifiedAttrHidden)]);
  });

  it('looks at both per-user privateAttrs and global config', () => {
    // eslint-disable-next-line camelcase
    const es = EventSerializer({ private_attribute_names: ['firstName', 'bizzle'] });
    const event = makeEvent(userSpecifyingOwnPrivateAttr);
    expect(es.serializeEvents([event])).toEqual([makeEvent(userWithAllAttrsHidden)]);
  });

  it('strips unknown top-level attributes', () => {
    const es = EventSerializer({});
    const event = makeEvent(userWithUnknownTopLevelAttrs);
    expect(es.serializeEvents([event])).toEqual([makeEvent(user)]);
  });

  it('leaves the "anonymous" attribute as is', () => {
    // eslint-disable-next-line camelcase
    const es = EventSerializer({ all_attributes_private: true });
    const event = makeEvent(anonUser);
    expect(es.serializeEvents([event])).toEqual([makeEvent(anonUserWithAllAttrsHidden)]);
  });
});
