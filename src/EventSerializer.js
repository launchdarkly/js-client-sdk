/**
 * The EventSerializer object transforms the internal representation of events into objects suitable to be sent
 * as JSON to the server. This includes hiding any private user attributes.
 *
 * @param {Object} the LaunchDarkly client configuration object
 **/
export default function EventSerializer(config) {
  const serializer = {};
  const allAttributesPrivate = config.all_attributes_private;
  const privateAttributeNames = config.private_attribute_names || [];
  const ignoreAttrs = { key: true, custom: true, anonymous: true };
  const allowedTopLevelAttrs = {
    key: true,
    secondary: true,
    ip: true,
    country: true,
    email: true,
    firstName: true,
    lastName: true,
    avatar: true,
    name: true,
    anonymous: true,
    custom: true,
  };

  function serializeEvent(event) {
    return Object.keys(event)
      .map(key => [key, key === 'user' ? filterUser(event[key]) : event[key]])
      .reduce(
        (acc, p) =>
          Object.assign({}, acc, {
            [p[0]]: p[1],
          }),
        {}
      );
  }

  function filterUser(user) {
    const userPrivateAttrs = user.privateAttributeNames || [];

    const isPrivateAttr = name =>
      !ignoreAttrs[name] &&
      (allAttributesPrivate || userPrivateAttrs.indexOf(name) !== -1 || privateAttributeNames.indexOf(name) !== -1);

    const filterAttrs = (props, isAttributeAllowed) =>
      Object.keys(props).reduce(
        (acc, name) => {
          const nextAcc = [...acc];

          if (isAttributeAllowed(name)) {
            if (isPrivateAttr(name)) {
              // add to hidden list
              nextAcc[1][name] = true;
            } else {
              nextAcc[0][name] = props[name];
            }
          }
          return acc;
        },
        [{}, {}]
      );

    const result = filterAttrs(user, key => allowedTopLevelAttrs[key]);
    const filteredProps = result[0];
    const removedAttrs = result[1];

    if (user.custom) {
      const customResult = filterAttrs(user.custom, () => true);
      filteredProps.custom = customResult[0];
      Object.assign(removedAttrs, customResult[1]);
    }

    const removedAttrNames = Object.keys(removedAttrs);

    if (removedAttrNames.length) {
      removedAttrNames.sort();
      filteredProps.privateAttrs = removedAttrNames;
    }
    return filteredProps;
  }

  serializer.serializeEvents = events => events.map(serializeEvent);

  return serializer;
}
