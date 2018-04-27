import * as utils from './utils';

function sanitizeUser(u) {
  const sane = utils.clone(u);
  if (sane.key) {
    sane.key = sane.key.toString();
  }
  return sane;
}

export default function Identity(initialUser, onChange) {
  const ident = {};
  let user;

  ident.setUser = function(u) {
    user = sanitizeUser(u);
    onChange(utils.clone(user));
  };

  ident.getUser = function() {
    return utils.clone(user);
  };

  if (initialUser) {
    ident.setUser(initialUser);
  }

  return ident;
}
