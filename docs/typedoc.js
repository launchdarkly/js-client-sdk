
// Note that the format of this file is barely documented on the TypeDoc site. In general,
// the properties are equivalent to the command-line options described here:
// https://typedoc.org/api/

let version = process.env.VERSION;
if (!version) {
  const package = require('../packages/ldclient-js/package.json');
  version = package.version;
}

module.exports = {
  out: './build/html',
  name: 'LaunchDarkly JavaScript SDK (' + version + ')',
  readme: 'none',                // don't add a home page with a copy of README.md
  mode: 'file',                  // don't treat "typings.d.ts" itself as a parent module
  includeDeclarations: true,     // allows it to process a .d.ts file instead of actual TS code
  entryPoint: '"ldclient-js"'    // note extra quotes - workaround for a TypeDoc bug
};
