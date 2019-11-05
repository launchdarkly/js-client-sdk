# Contributing to LaunchDarkly SDK for Browser JavaScript

LaunchDarkly has published an [SDK contributor's guide](https://docs.launchdarkly.com/docs/sdk-contributors-guide) that provides a detailed explanation of how our SDKs work. See below for additional information on how to contribute to this SDK.
 
## Submitting bug reports and feature requests

The LaunchDarkly SDK team monitors the [issue tracker](https://github.com/launchdarkly/js-client-sdk/issues) in the SDK repository. Bug reports and feature requests specific to this SDK should be filed in this issue tracker. The SDK team will respond to all newly filed issues within two business days.

## Submitting pull requests

We encourage pull requests and other contributions from the community. Before submitting pull requests, ensure that all temporary or unintended code is removed. Don't worry about adding reviewers to the pull request; the LaunchDarkly SDK team will add themselves. The SDK team will acknowledge all pull requests within two business days.

## Build instructions

### Prerequisites

Note that much of the basic SDK logic, which is common to all of the LaunchDarkly client-side JavaScript-based SDKs, is in the `launchdarkly-js-sdk-common` package in the [js-sdk-common](https://github.com/launchdarkly/js-sdk-common) repository. This is pulled in automatically by `npm` when you build the SDK, but if you are planning to make changes that affect the common code, you will need to check out that repository as well.

### Setup

To install project dependencies, from the project root directory:

```
npm install
```

### Testing

To run all unit tests:

```
npm test
```

To verify that the TypeScript declarations compile correctly (this involves compiling the file `test-types.ts`, so if you have changed any types or interfaces, you will want to update that code):

```
npm run check-typescript
```
