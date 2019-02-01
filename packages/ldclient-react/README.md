# LaunchDarkly SDK for Browser JavaScript - React Interface

## Introduction

This is the official LaunchDarkly React SDK. It provides a subset of LaunchDarkly feature flag functionality, including:

* Easy initialization and usage with React.
* Feature flags as camelCased props through the Context API.
* Subscription to flag changes out of the box.

Under the hood, this SDK uses the [main LaunchDarkly JavaScript SDK](../ldclient-js/README.md), but with an interface that uses React's Context API.

For a general overview of JavaScript SDK characteristics, see the [main README](../../README.md). Also see the online [React SDK Reference](https://docs.launchdarkly.com/docs/react-sdk-reference).

## Dependency

This SDK needs React >= 16.3.0 because it uses the Context API.

## Installation

```
yarn add ldclient-react
```

## Quickstart

1. Call the `withLDProvider` function with your clientSideID and then pass the resulting function
your root React component:

    ```js
    import { withLDProvider } from 'ldclient-react';

    const App = () =>
     <div>
        <Home />
     </div>;

    export default withLDProvider({ clientSideID: 'your-client-side-id' })(App);
    ```

2. Anywhere you need flags, call the `withLDConsumer` function and then pass your component 
to the resulting function. Your flags are available via props.flags:

    ```js
    import { withLDConsumer } from 'ldclient-react';

    // flags are available via props
    const Home = ({ flags }) => {
       return flags.devTestFlag ? <div>Flag on</div> : <div>Flag off</div>;
    };

    export default withLDConsumer()(Home);
    ```

## API
### `withLDProvider(config: { clientSideID: string, user?: LDUser, options?: LDOptions, flags?: LDFlagSet })`
`withLDProvider` is a function which accepts a config object which is used to initialise ldclient-js.
It returns a function which accepts your root react component and returns a HOC. This HOC does three things:

* It initializes the ldClient instance by calling the `initialize` method of ldclient-js on `componentDidMount`

* It saves all flags and the ldClient instance in the Context API

* It subscribes to flag changes and propagate them through the Context API

#### Parameter
#### `config: { clientSideID: string, user?: LDUser, options?: LDOptions, flags?: LDFlagSet }`

##### `clientSideID: string`
This is the clientSideID specific to your project and environment. You can find this in 
under account settings in your LD portal. This is the only property required to use the 
React SDK.

##### `user?: LDUser`
This user will be used to initialize the SDK. For more info about users, check [here](http://docs.launchdarkly.com/docs/js-sdk-reference#section-users).
If not specified, ldclient-react will create a default user that looks like this:

   ```js
    const defaultUser = {
      key: uuid.v4(), // random guid
    };
   ```

##### `options?: LDOptions`
These options will be used to customise the ldClient instance. To see what options are available, check the 
[JS SDK reference](https://docs.launchdarkly.com/docs/js-sdk-reference#section-customizing-your-client). 
For example:

   ```js
    withLDProvider({
        clientSideID,
        options: {
          bootstrap: 'localStorage',
        },
    })(App);
   ```

##### `flags?: LDFlagSet`
You can explicitly specify the flags available to your app by setting this property. This is a flat
key value object where key is the feature flag key (as shown on your LaunchDarkly dashboard, not the camelCased version) 
and value is the default value of the flag. Under the hood, the React SDK calls ldClient.variation on each flag 
you specify here. If unspecified, the React SDK will call ldClient.allFlags which is equivalent to 
calling variation on all the flags exposed to the JS SDK. 

Explicitly specifying flags might give you better usage statistics than calling allFlags. However you will need to maintain
this list when you are adding new flags or removing old ones. For example, the code below makes `dev-test-flag` 
and `another-flag` available to your app and subscribes to them. All other flags are ignored.
                                                     
   ```js
    withLDProvider({
        clientSideID,
        flags: {
          'dev-test-flag': false,
          'another-flag': false,
        },
    })(App);
   ```

#### Returns
The return of `withLDProvider` is a function that takes your root React component and returns a HOC 
with flags and ldClient saved in the Context API.

#### Example Usage
```js
import React from 'react';
import { withLDProvider } from 'ldclient-react';
import Home from './home';

const App = () => (
  <div>
    <Home />
  </div>
);

export default withLDProvider({
  clientSideID: 'your-client-side-id',
  user: { key: 'some-user-key' }, // optional
  options: { bootstrap: 'localStorage' }, // optional
})(App);
```

-----------------

### `withLDConsumer(options?: { clientOnly: boolean })`
`withLDConsumer` is a function which accepts an optional options object. It returns a function which 
accepts your component and returns a HOC injected with flags and ldClient props.

Use `withLDConsumer` anywhere you need flags and ldClient. Your flags will 
be available as camelCased properties under `this.props.flags` and ldClient as `this.props.ldClient`.

#### Parameter
#### `options: { clientOnly: boolean } = { clientOnly: false }`

##### `clientOnly: boolean`
If your component only needs the ldClient instance but not flags, set this to `true`. By default this 
is `false` meaning your component will get both flags and the ldClient instance.

#### Returns
The return of `withLDConsumer` is a function that takes your component and returns a HOC with 
flags and the ldClient instance injected via props.

#### Example usage:
```js
import React, { Component } from 'react';
import { withLDConsumer } from 'ldclient-react';

class Home extends Component {
  // track goals
  onAddToCart = () => this.props.ldClient.track('add to cart');

  // change user context
  onLoginSuccessful = () => this.props.ldClient.identify({ key: 'someUserId' });

  render() {
    // access your flags through this.props.flags
    return <div>{this.props.flags.devTestFlag ? <div>Flag on</div> : <div>Flag off</div>}</div>;
  }
}

export default withLDConsumer()(Home);

```

## Example

Check the [example](example) for a fully working spa with react and react-router. Remember to enter your clientSideID in the client [root app file](example/src/universal/app.js) and create a flag called `dev-test-flag` in your dashboard before running the example.

## Alternatives from the community

Third-party developers have created their own React interfaces for the LaunchDarkly JavaScript SDK:

* [TrueCar/react-launch-darkly](https://github.com/TrueCar/react-launch-darkly/): A basic React wrapper with similar functionality
* [yusinto/ld-redux](https://github.com/yusinto/ld-redux/): An implementation specifically for Redux
* [tdeekens/flopflip](https://github.com/tdeekens/flopflip): A flexible feature-toggling library that integrates with LaunchDarkly
