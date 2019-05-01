# Contributing to LaunchDarkly SDK for Browser JavaScript

LaunchDarkly has published an [SDK contributor's guide](https://docs.launchdarkly.com/docs/sdk-contributors-guide) that provides a detailed explanation of how our SDKs work. See below for additional information on how to contribute to this SDK.
 
## Submitting bug reports and feature requests

The LaunchDarkly SDK team monitors the [issue tracker](https://github.com/launchdarkly/js-client-sdk/issues) in the SDK repository. Bug reports and feature requests specific to this SDK should be filed in this issue tracker. The SDK team will respond to all newly filed issues within two business days.

Submitting pull requests
------------------

We encourage pull requests and other contributions from the community. Before submitting pull requests, ensure that all temporary or unintended code is removed. Don't worry about adding reviewers to the pull request; the LaunchDarkly SDK team will add themselves. The SDK team will acknowledge all pull requests within two business days.

Build instructions
------------------

Before building the code, it would be helpful to know a bit about the structure of the code in this repository. This repository is a monorepo containing three projects, each of which is published to npm as a package with the same name:

- `launchdarkly-js-client-sdk`: This is the main SDK package that applications will import. Any logic that specifically relies on being in a browser environment should go here (see `browserPlatform.js`). This automatically imports `launchdarkly-js-sdk-common`.
- `launchdarkly-js-sdk-common`: Internal implementation code that is not browser-specific.
- `launchdarkly-react-client-sdk`: The React wrapper. This automatically imports both of the other packages.

The reason `launchdarkly-js-sdk-common` exists is that the [Electron SDK](https://github.com/launchdarkly/electron-client) has very similar functionality to the browser SDK. Therefore, all of the code that is used by both has been factored out into the common package.

### Prerequisites

Before building the SDK, you need to install [Lerna](https://www.npmjs.com/package/lerna).

```
npm install lerna
```

### Building

You can build all three packages by running the following command from the root directory:

```
npm run build
```

### Testing

You can run all tests by running the following command from the root directory:

```
npm test
```
