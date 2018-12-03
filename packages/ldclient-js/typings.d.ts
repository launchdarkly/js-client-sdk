/**
 * The LaunchDarkly JavaScript client interfaces - browser SDK version.
 *
 * Documentation: http://docs.launchdarkly.com/docs/js-sdk-reference
 */
declare module 'ldclient-js' {
  export * from 'ldclient-js-common';

  import { LDClientBase, LDOptionsBase, LDUser } from 'ldclient-js-common';

  export const initialize: (envKey: string, user: LDUser, options?: LDOptions) => LDClient;

  const LaunchDarkly: {
    initialize: (envKey: string, user: LDUser, options?: LDOptions) => LDClient;
    version: string;
  };

  export default LaunchDarkly;

  /**
   * Initialization options for the LaunchDarkly browser SDK.
   */
  export interface LDOptions extends LDOptionsBase {
    /**
     * The signed user key for Secure Mode.
     */
    hash?: string;

    /**
     * True (the default) if the client should make a request to LaunchDarkly for
     * A/B testing goals. By default, this request is made on every page load.
     * Set it to false if you are not using A/B testing and want to skip the request.
     */
    fetchGoals?: boolean;
  }

  /**
   * The LaunchDarkly client's instance interface.
   *
   * @see http://docs.launchdarkly.com/docs/js-sdk-reference
   */
  export interface LDClient extends LDClientBase {
    /**
     * Allows you to wait until the client has received goals data from LaunchDarkly.
     * This is only relevant if you are using A/B testing features like click events and
     * pageview events; until the client has received the configuration for these (which
     * happens immediately after the initial request for feature flags), click events and
     * pageview events will not work, so you may wish to wait using this method before
     * doing anything that you expect to generate those events.
     *
     * The returned Promise will be resolved once the client has received goals data. If
     * you prefer to use event handlers rather than Promises, you can listen on the client
     * for a "goalsReady" event instead.
     * 
     * @returns a Promise containing the initialization state of the client
     */
    waitUntilGoalsReady: () => Promise<void>;
  }
}
