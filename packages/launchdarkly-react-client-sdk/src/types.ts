import { LDClient, LDFlagSet, LDOptions, LDUser } from 'launchdarkly-js-client-sdk';
import * as React from 'react';

/**
 * Initialization options for the LaunchDarkly React SDK. These are in addition to the options exposed
 * by [[LDOptions]] which are common to both the JavaScript and React SDKs.
 */
export interface LDReactOptions {
  /**
   * Whether the React SDK should transform flag keys into camel-cased format.
   * Using camel-cased flag keys allow for easier use as prop values, however,
   * these keys won't directly match the flag keys as known to LaunchDarkly.
   * Consequently, flag key collisions may be possible and the Code References feature
   * will not function properly.
   *
   * This is true by default, meaning that keys will automatically be converted to camel-case.
   *
   * For more information, see the React SDK Reference Guide on
   * [flag keys](https://docs.launchdarkly.com/docs/react-sdk-reference#section-flag-keys).
   */
  useCamelCaseFlagKeys?: boolean;
}

export const defaultReactOptions = { useCamelCaseFlagKeys: true };

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
   * LaunchDarkly initialization options. These options are common between LaunchDarkly's JavaScript and React SDKs.
   *
   * @see https://docs.launchdarkly.com/docs/js-sdk-reference#section-customizing-your-client
   */
  options?: LDOptions;

  /**
   * Additional initialization options specific to the React SDK.
   *
   * @see options
   */
  reactOptions?: LDReactOptions;

  /**
   * If specified, launchdarkly-react-client-sdk will only request and listen to these flags.
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
