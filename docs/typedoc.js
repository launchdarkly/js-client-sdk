
// Note that the format of this file is barely documented on the TypeDoc site. In general,
// the properties are equivalent to the command-line options described here:
// https://typedoc.org/api/

let version = process.env.VERSION;
if (!version) {
  const package = require('../package.json');
  version = package.version;
}

module.exports = {
  out: './build/html',
  name: 'LaunchDarkly JavaScript SDK (' + version + ')',
  readme: 'doc.md',
  entryPointStrategy: 'resolve', // Allows us to specify the specific entrypoints.
  entryPoints: ["./build/typings.d.ts"] // This is the updated version created by the makefile.
};
