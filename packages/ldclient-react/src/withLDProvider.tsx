import * as React from 'react';
import { camelCase } from 'lodash';
import { LDClient, LDFlagSet, LDOptions, LDUser, LDFlagChangeset } from 'ldclient-js';
import { Provider, LDContext as HocState } from './context';
import initLDClient from './initLDClient';

/**
 * Configuration object used to initialise LaunchDarkly's js client.
 */
export interface ProviderConfig {
  /**
   * Your project and environment specific client side ID. You can find
   * this in your LaunchDarkly portal under Account settings. This is
   * the only mandatory property required to use the React SDK.
   */
  clientSideID: string;

  /**
   * A LaunchDarkly user object. If unspecified, a new user with a
   * random key will be created and used.
   *
   * @see http://docs.launchdarkly.com/docs/js-sdk-reference#section-users
   */
  user?: LDUser;

  /**
   * LaunchDarkly initialization options.
   *
   * @see https://docs.launchdarkly.com/docs/js-sdk-reference#section-customizing-your-client
   */
  options?: LDOptions;

  /**
   * If specified, ldclient-react will only request and listen to these flags.
   * Otherwise, all flags will be requested and listened to.
   */
  flags?: LDFlagSet;
}

/**
 * The return type of withLDProvider HOC. Exported for testing purposes only.
 */
export interface EnhancedComponent extends React.Component {
  subscribeToChanges(ldClient: LDClient): void;
  componentDidMount(): Promise<void>;
}

/**
 * withLDProvider is a function which accepts a config object which is used to initialise ldclient-js.
 * It returns a function which accepts your root React component and returns a HOC.
 * This HOC does three things:
 * - It initializes the ldClient instance by calling ldclient-js initialize on componentDidMount
 * - It saves all flags and the ldClient instance in the context api
 * - It subscribes to flag changes and propagate them through the context api
 *
 * @param config - The configuration used to initialize LaunchDarkly's js client
 */
export function withLDProvider(config: ProviderConfig) {
  return function withLDPoviderHoc<P>(WrappedComponent: React.ComponentType<P>) {
    return class extends React.Component<P, HocState> implements EnhancedComponent {
      readonly state: Readonly<HocState> = { flags: {}, ldClient: undefined };

      subscribeToChanges = (ldClient: LDClient) => {
        ldClient.on('change', (changes: LDFlagChangeset) => {
          const flattened: LDFlagSet = {};
          for (const key in changes) {
            flattened[camelCase(key)] = changes[key].current;
          }
          this.setState(({ flags }) => ({ flags: { ...flags, ...flattened } }));
        });
      };

      async componentDidMount() {
        const { clientSideID, user, options, flags } = config;
        const { flags: fetchedFlags, ldClient } = await initLDClient(clientSideID, user, options, flags);
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
