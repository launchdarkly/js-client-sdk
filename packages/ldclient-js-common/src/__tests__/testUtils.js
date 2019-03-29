
export const numericUser = {
  key: 1,
  secondary: 2,
  ip: 3,
  country: 4,
  email: 5,
  firstName: 6,
  lastName: 7,
  avatar: 8,
  name: 9,
  anonymous: false,
  custom: { age: 99 },
};

export const stringifiedNumericUser = {
  key: '1',
  secondary: '2',
  ip: '3',
  country: '4',
  email: '5',
  firstName: '6',
  lastName: '7',
  avatar: '8',
  name: '9',
  anonymous: false,
  custom: { age: 99 },
};

export function makeBootstrap(flagsData) {
  const ret = { $flagsState: {} };
  for (const key in flagsData) {
    const state = Object.assign({}, flagsData[key]);
    ret[key] = state.value;
    delete state.value;
    ret.$flagsState[key] = state;
  }
  return ret;
}
