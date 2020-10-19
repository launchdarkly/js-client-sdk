import { doesUrlMatch } from '../GoalTracker';

describe('url matching', () => {
  const getHash = url => {
    const idx = url.indexOf('#');
    return idx === -1 ? '' : url.substring(idx, url.length);
  };

  const getSearch = url => {
    const idx = url.indexOf('?');
    return idx === -1 ? '' : url.substring(idx, url.length);
  };

  const urlMatch = (matcher, href) => {
    const hash = getHash(href);
    const search = hash === '' ? getSearch(href) : '';
    const matches = doesUrlMatch(matcher, href, search, hash);
    return expect(matches);
  };

  const base = 'https://www.test.com';

  // these would have very complex permutation rules
  // so for now hardcode tests rather than generate
  // every possible set of inputs
  const exact = [
    { path: '', goal: '', match: true },
    { path: '', goal: '/part', match: false },
    { path: '/part', goal: '', match: false },
    { path: '/part', goal: '/part', match: true },

    { path: '/part#section', goal: '/part', match: false },
    { path: '/part', goal: '/part#section', match: false },
    { path: '/part#section', goal: '/part#section', match: true },
    { path: '', goal: '/part#section', match: false },
    { path: '/part#section', goal: '', match: false },

    { path: '/part?query=search', goal: '/part', match: false },
    { path: '/part', goal: '/part?query=search', match: false },
    { path: '/part?query=search', goal: '/part?query=search', match: true },
    { path: '/part?query=search', goal: '', match: false },
    { path: '', goal: '/part?query=search', match: false },

    { path: '', goal: '/part#section?query=search', match: false },
    { path: '/part#section?query=search', goal: '', match: false },

    { path: '/part#section?query=search', goal: '/part', match: false },
    { path: '/part#section?query=search', goal: '/part#section', match: false },
    { path: '/part#section?query=search', goal: '/part?query=search', match: false },

    { path: '/part', goal: '/part#section?query=search', match: false },
    { path: '/part#section', goal: '/part#section?query=search', match: false },
    { path: '/part?query=search', goal: '/part#section?query=search', match: false },

    { path: '/part#section?query=search', goal: '/part#section?query=search', match: true },

    { path: '/part/#/part2', goal: '/part', match: false },
    { path: '/part/#/part2', goal: '/part/#/part2', match: true },
    { path: '/part/#/part2', goal: '/part/#/part2#section', match: false },
    { path: '/part/#/part2#section', goal: '/part/#/part2#section', match: true },
  ];

  const canonical = [
    { path: '', goal: '', match: true },
    { path: '', goal: '/part', match: false },
    { path: '/part', goal: '', match: false },
    { path: '/part', goal: '/part', match: true },

    { path: '/part#section', goal: '/part', match: true },
    { path: '/part', goal: '/part#section', match: false },
    { path: '/part#section', goal: '/part#section', match: false },
    { path: '', goal: '/part#section', match: false },
    { path: '/part#section', goal: '', match: false },

    { path: '/part?query=search', goal: '/part', match: true },
    { path: '/part', goal: '/part?query=search', match: false },
    { path: '/part?query=search', goal: '/part?query=search', match: false },
    { path: '/part?query=search', goal: '', match: false },
    { path: '', goal: '/part?query=search', match: false },

    { path: '', goal: '/part#section?query=search', match: false },
    { path: '/part#section?query=search', goal: '', match: false },

    { path: '/part#section?query=search', goal: '/part', match: true },
    { path: '/part#section?query=search', goal: '/part#section', match: false },
    { path: '/part#section?query=search', goal: '/part?query=search', match: false },

    { path: '/part', goal: '/part#section?query=search', match: false },
    { path: '/part#section', goal: '/part#section?query=search', match: false },
    { path: '/part?query=search', goal: '/part#section?query=search', match: false },

    { path: '/part#section?query=search', goal: '/part#section?query=search', match: false },

    { path: '/part/#/part2', goal: '/part', match: true },
    { path: '/part/#/part2', goal: '/part/#/part2', match: false },
    { path: '/part/#/part2', goal: '/part/#/part2#section', match: false },
    { path: '/part/#/part2#section', goal: '/part/#/part2#section', match: false },
  ];

  const substring = [
    { path: '', goal: '', match: true },
    { path: '', goal: '/part', match: false },
    { path: '/part', goal: '', match: true },
    { path: '/part', goal: '/part', match: true },

    { path: '/part#section', goal: '/part', match: true },
    { path: '/part', goal: '/part#section', match: false },
    { path: '/part#section', goal: '/part#section', match: false },
    { path: '', goal: '/part#section', match: false },
    { path: '/part#section', goal: '', match: true },

    { path: '/part?query=search', goal: '/part', match: true },
    { path: '/part', goal: '/part?query=search', match: false },
    { path: '/part?query=search', goal: '/part?query=search', match: false },
    { path: '/part?query=search', goal: '', match: true },
    { path: '', goal: '/part?query=search', match: false },

    { path: '', goal: '/part#section?query=search', match: false },
    { path: '/part#section?query=search', goal: '', match: true },

    { path: '/part#section?query=search', goal: '/part', match: true },
    { path: '/part#section?query=search', goal: '/part#section', match: false },
    { path: '/part#section?query=search', goal: '/part?query=search', match: false },

    { path: '/part', goal: '/part#section?query=search', match: false },
    { path: '/part#section', goal: '/part#section?query=search', match: false },
    { path: '/part?query=search', goal: '/part#section?query=search', match: false },

    { path: '/part#section?query=search', goal: '/part#section?query=search', match: false },

    { path: '/part/#/part2', goal: '/part', match: true },
    { path: '/part/#/part2', goal: '/part2', match: true },
    { path: '/part/#/part2#section', goal: 'section', match: true },
    { path: '/part/#/part2', goal: '/part/#/part2', match: true },
    { path: '/part/#/part2', goal: '/part/#/part2#section', match: false },
    { path: '/part/#/part2#section', goal: '/part/#/part2#section', match: true },
  ];

  const regex = [
    { path: '', goal: '/part', match: false },
    { path: '/part', goal: 'a', match: true },
    { path: '/part#123', goal: '\\d+', match: false },
    { path: '/part123#123', goal: '\\d+', match: true },
  ];

  const invalid = [
    { path: '', goal: '', match: false },
    { path: '', goal: '/part', match: false },
    { path: '/part', goal: '', match: false },
    { path: '/part', goal: '/part', match: false },

    { path: '/part#section', goal: '/part', match: false },
    { path: '/part', goal: '/part#section', match: false },
    { path: '/part#section', goal: '/part#section', match: false },
    { path: '', goal: '/part#section', match: false },
    { path: '/part#section', goal: '', match: false },

    { path: '/part?query=search', goal: '/part', match: false },
    { path: '/part', goal: '/part?query=search', match: false },
    { path: '/part?query=search', goal: '/part?query=search', match: false },
    { path: '/part?query=search', goal: '', match: false },
    { path: '', goal: '/part?query=search', match: false },

    { path: '', goal: '/part#section?query=search', match: false },
    { path: '/part#section?query=search', goal: '', match: false },

    { path: '/part#section?query=search', goal: '/part', match: false },
    { path: '/part#section?query=search', goal: '/part#section', match: false },
    { path: '/part#section?query=search', goal: '/part?query=search', match: false },

    { path: '/part', goal: '/part#section?query=search', match: false },
    { path: '/part#section', goal: '/part#section?query=search', match: false },
    { path: '/part?query=search', goal: '/part#section?query=search', match: false },

    { path: '/part#section?query=search', goal: '/part#section?query=search', match: false },

    { path: '/part/#/part2', goal: '/part', match: false },
    { path: '/part/#/part2', goal: '/part/#/part2', match: false },
    { path: '/part/#/part2', goal: '/part/#/part2#section', match: false },
    { path: '/part/#/part2#section', goal: '/part/#/part2#section', match: false },
  ];

  const tests = [
    {
      type: 'exact',
      tests: exact,
      matcher: (ext, match) => urlMatch({ kind: 'exact', url: base + match }, base + ext),
    },
    {
      type: 'canonical',
      tests: canonical,
      matcher: (ext, match) => urlMatch({ kind: 'canonical', url: base + match }, base + ext),
    },
    {
      type: 'substring',
      tests: substring,
      matcher: (ext, str) => urlMatch({ kind: 'substring', substring: str }, base + ext),
    },
    {
      type: 'regex',
      tests: regex,
      matcher: (ext, pattern) => urlMatch({ kind: 'regex', pattern: pattern }, base + ext),
    },
    {
      type: 'invalid',
      tests: invalid,
      matcher: (ext, match) => urlMatch({ kind: 'invalid' }, base + match),
    },
  ];

  tests.forEach(method => {
    describe(method.type + ' matching', () => {
      method.tests.forEach(each => {
        it(`expects \`${each.goal}\` to ${each.match ? 'match' : 'not match'} \`${each.path}\``, async () => {
          method.matcher(each.path, each.goal).toEqual(each.match);
        });
      });
    });
  });
});
