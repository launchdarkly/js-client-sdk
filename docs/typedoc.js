
// Note that the format of this file is barely documented on the TypeDoc site. In general,
// the properties are equivalent to the command-line options described here:
// https://typedoc.org/api/

// Also note, typedoc is actually being run from packages/ldclient-js, so file paths are relative to that

module.exports = {
  out: '../../docs/build/html',
  exclude: [
    '**/node_modules/**',
    'test-types.ts'
  ],
  name: 'LaunchDarkly JavaScript SDK',
  readme: 'none',                // don't add a home page with a copy of README.md
  mode: 'file',                  // don't treat "typings.d.ts" itself as a parent module
  includeDeclarations: true,     // allows it to process a .d.ts file instead of actual TS code
  entryPoint: '"ldclient-js"'    // note extra quotes - workaround for a TypeDoc bug
};
