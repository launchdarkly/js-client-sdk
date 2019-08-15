import * as React from 'react';
import camelCase from 'lodash.camelcase';
import { LDClient, LDFlagSet, LDFlagChangeset } from 'launchdarkly-js-client-sdk';
import { defaultReactOptions, ProviderConfig, EnhancedComponent } from './types';
import { Provider, LDContext as HocState } from './context';
import initLDClient from './initLDClient';
import { camelCaseKeys } from './utils';

/**
 * withLDProvider is a function which accepts a config object which is used to initialise launchdarkly-js-client-sdk.
 * It returns a function which accepts your root React component and returns a HOC.
 * This HOC does three things:
 * - It initializes the ldClient instance by calling launchdarkly-js-client-sdk initialize on componentDidMount
 * - It saves all flags and the ldClient instance in the context api
 * - It subscribes to flag changes and propagate them through the context api
 *
 * @param config - The configuration used to initialize LaunchDarkly's js client
 */
export function withLDProvider(config: ProviderConfig) {
  return function withLDPoviderHoc<P>(WrappedComponent: React.ComponentType<P>) {
    const { options, reactOptions: userReactOptions } = config;
    const reactOptions = { ...defaultReactOptions, ...userReactOptions };

    return class extends React.Component<P, HocState> implements EnhancedComponent {
      readonly state: Readonly<HocState>;

      constructor(props: P) {
        super(props);

        this.state = {
          flags: {},
          ldClient: undefined,
        };

        if (options) {
          const { bootstrap } = options;
          if (bootstrap && bootstrap !== 'localStorage') {
            const flags = reactOptions.useCamelCaseFlagKeys ? camelCaseKeys(bootstrap) : bootstrap;
            this.state = {
              flags,
              ldClient: undefined,
            };
          }
        }
      }

      subscribeToChanges = (ldClient: LDClient) => {
        ldClient.on('change', (changes: LDFlagChangeset) => {
          const flattened: LDFlagSet = {};
          for (const key in changes) {
            // tslint:disable-next-line:no-unsafe-any
            const flagKey = reactOptions.useCamelCaseFlagKeys ? camelCase(key) : key;
            flattened[flagKey] = changes[key].current;
          }
          this.setState(({ flags }) => ({ flags: { ...flags, ...flattened } }));
        });
      };

      async componentDidMount() {
        const { clientSideID, user, flags } = config;
        const { flags: fetchedFlags, ldClient } = await initLDClient(clientSideID, user, reactOptions, options, flags);
        this.setState({ flags: fetchedFlags, ldClient });
        this.subscribeToChanges(ldClient);
      }

      render() {
        return (
          <Provider value={this.state}>
            <WrappedComponent {...this.props} />
          </Provider>
        );
      }
    };
  };
}

export default withLDProvider;
