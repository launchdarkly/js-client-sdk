# LaunchDarkly SDK JavaScript Common Code

This file contains the `ldclient-js-common` package, which is used by the LaunchDarkly JavaScript, React, and Electron SDKs. Applications should not need to refer to this package directly, as it is loaded automatically as a dependency of the SDK packages.

Note that the TypeScript declaration file `typings.d.ts` in this directory describes only the types and methods that are provided by the common package. The `typings.d.ts` file in `ldclient-js` imports all of these definitions, so application code can just import `ldclient-js`.
