# Contributing to LaunchDarkly SDK for JavaScript

We encourage pull-requests and other contributions from the community. We've also published an [SDK contributor's guide](http://docs.launchdarkly.com/docs/sdk-contributors-guide) that provides a detailed explanation of how our SDKs work.

This repository is a monorepo containing two projects, each of which is published to npm as a package with the same name:

- `ldclient-js`: This is the SDK package that applications will import. Any logic that specifically relies on being in a browser environment should go here (see `browserPlatform.js`).
- `ldclient-js-common`: Internal implementation code that is not browser-specific.

The reason `ldclient-js-common` exists is that the [Electron SDK](https://github.com/launchdarkly/electron-client) has very similar functionality to the browser SDK. Therefore, all of the code that is used by both has been factored out into the common package.
