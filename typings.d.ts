/**
 * This is the API reference for the LaunchDarkly SDK for browser JavaScript.
 *
 * In typical usage, you will call [[initialize]] once at startup time to obtain an instance of
 * [[LDClient]], which provides access to all of the SDK's functionality.
 *
 * For more information, see the [SDK reference guide](https://docs.launchdarkly.com/sdk/client-side/javascript).
 */
declare module 'launchdarkly-js-client-sdk' {

//// DOCBUILD-START-REPLACE  (see docs/Makefile)
  export * from 'launchdarkly-js-sdk-common';
  import { LDClientBase, LDOptionsBase, LDUser } from 'launchdarkly-js-sdk-common';
//// DOCBUILD-END-REPLACE

  /**
   * Creates an instance of the LaunchDarkly client.
   *
   * The client will begin attempting to connect to LaunchDarkly as soon as it is created. To
   * determine when it is ready to use, call [[LDClient.waitForInitialization]], or register an
   * event listener for the `"ready"` event using [[LDClient.on]].
   *
   * Note that you can either import this as a named export or as part of the default exports,
   * although the latter is deprecated:
   *
   *     // Preferred usage:
   *     import { initialize } from 'launchdarkly-js-client-sdk';
   *     const client = initialize(envKey, user, options);
   *
   *     // Deprecated usage:
   *     import LaunchDarkly from 'launchdarkly-js-client-sdk';
   *     const client = LaunchDarkly.initialize(envKey, user, options);
   *
   * @param envKey
   *   The environment ID.
   * @param user
   *   The initial user properties. These can be changed later with [[LDClient.identify]].
   * @param options
   *   Optional configuration settings.
   * @return
   *   The new client instance.
   */
  export function initialize(envKey: string, user: LDUser, options?: LDOptions): LDClient;

  // This is @ignored because TypeDoc does not show default exports correctly. We'll just explain
  // the export situation in the comment for initialize().
  /** @ignore */
  const LaunchDarkly: {
    initialize: (envKey: string, user: LDUser, options?: LDOptions) => LDClient;
    version: string;
  };

  /** @ignore */ // see above
  export default LaunchDarkly;

  /**
   * Initialization options for the LaunchDarkly browser SDK.
   */
  export interface LDOptions extends LDOptionsBase {
    /**
     * The signed user key for Secure Mode.
     *
     * For more information, see the JavaScript SDK Reference Guide on
     * [Secure mode](https://docs.launchdarkly.com/sdk/features/secure-mode#configuring-secure-mode-in-the-javascript-client-side-sdk).
     */
    hash?: string;

    /**
     * Whether the client should make a request to LaunchDarkly for A/B testing goals.
     *
     * This is true by default, meaning that this request will be made on every page load.
     * Set it to false if you are not using A/B testing and want to skip the request.
     */
    fetchGoals?: boolean;

    /**
     * A function which, if present, can change the URL in analytics events to something other
     * than the actual browser URL. It will be called with the current browser URL as a parameter,
     * and returns the value that should be stored in the event's `url` property.
     */
    eventUrlTransformer?: (url: string) => string;

    /**
     * If set to true, this prevents the SDK from trying to use a synchronous HTTP request to deliver
     * analytics events if the page is being closed. Not all browsers allow such requests; the SDK
     * normally tries to avoid making them if not allowed, by using browser detection, but sometimes
     * browser detection may not work so if you are seeing errors like "synchronous XHR request
     * during page dismissal", you may want to set this option. Since currently the SDK does not have
     * a better way to deliver events in this scenario, some events may be lost.
     */
    disableSyncEventPost?: boolean;
  }

  /**
   * The LaunchDarkly SDK client object.
   *
   * Applications should configure the client at page load time and reuse the same instance.
   *
   * For more information, see the [SDK Reference Guide](https://docs.launchdarkly.com/sdk/client-side/javascript).
   */
  export interface LDClient extends LDClientBase {
    /**
     * Allows you to wait until the client has received goals data from LaunchDarkly.
     *
     * This is only relevant if you are using A/B testing features like click events and
     * pageview events; until the client has received the configuration for these (which
     * happens immediately after the initial request for feature flags), click events and
     * pageview events will not work, so you may wish to wait using this method before
     * doing anything that you expect to generate those events.
     *
     * The returned Promise will be resolved once the client has received goals data. If
     * you prefer to use event handlers rather than Promises, you can listen on the client
     * for a `"goalsReady"` event instead.
     *
     * @returns
     *   A Promise containing the initialization state of the client.
     */
    waitUntilGoalsReady(): Promise<void>;
  }
}
