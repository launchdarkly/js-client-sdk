import * as utils from './utils';

export default function Identity(initialUser, onChange) {
  const ident = {};
  let user;

  ident.setUser = function(u) {
    user = utils.sanitizeUser(u);
    if (user && onChange) {
      onChange(utils.clone(user));
    }
  };

  ident.getUser = function() {
    return user ? utils.clone(user) : null;
  };

  if (initialUser) {
    ident.setUser(initialUser);
  }

  return ident;
}
