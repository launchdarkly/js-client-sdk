import UserFilter from '../UserFilter';

describe('UserFilter', () => {
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
    custom: { dizzle: 'ghi' },
    privateAttrs: ['bizzle', 'firstName'],
  };

  const userWithOwnSpecifiedAttrHidden = {
    key: 'abc',
    firstName: 'Sue',
    custom: { bizzle: 'def' },
    privateAttrs: ['dizzle'],
  };

  const anonUserWithAllAttrsHidden = {
    key: 'abc',
    anonymous: true,
    custom: {},
    privateAttrs: ['bizzle', 'dizzle'],
  };

  it('includes all user attributes by default', () => {
    const uf = UserFilter({});
    expect(uf.filterUser(user)).toEqual(user);
  });

  it('hides all except key if allAttributesPrivate is true', () => {
    const uf = UserFilter({ allAttributesPrivate: true });
    expect(uf.filterUser(user)).toEqual(userWithAllAttrsHidden);
  });

  it('hides some attributes if privateAttributeNames is set', () => {
    const uf = UserFilter({ privateAttributeNames: ['firstName', 'bizzle'] });
    expect(uf.filterUser(user)).toEqual(userWithSomeAttrsHidden);
  });

  it('hides attributes specified in per-user privateAttrs', () => {
    const uf = UserFilter({});
    expect(uf.filterUser(userSpecifyingOwnPrivateAttr)).toEqual(userWithOwnSpecifiedAttrHidden);
  });

  it('looks at both per-user privateAttrs and global config', () => {
    const uf = UserFilter({ privateAttributeNames: ['firstName', 'bizzle'] });
    expect(uf.filterUser(userSpecifyingOwnPrivateAttr)).toEqual(userWithAllAttrsHidden);
  });

  it('strips unknown top-level attributes', () => {
    const uf = UserFilter({});
    expect(uf.filterUser(userWithUnknownTopLevelAttrs)).toEqual(user);
  });

  it('leaves the "anonymous" attribute as is', () => {
    const uf = UserFilter({ allAttributesPrivate: true });
    expect(uf.filterUser(anonUser)).toEqual(anonUserWithAllAttrsHidden);
  });
});
