/**
 * This is the API reference for the LaunchDarkly SDK for browser JavaScript.
 *
 * In typical usage, you will call {@link initialize} once at startup time to obtain an instance of
 * {@link LDClient}, which provides access to all of the SDK's functionality.
 *
 * For more information, see the [SDK reference guide](https://docs.launchdarkly.com/sdk/client-side/javascript).
 *
 * @packageDocumentation
 */

declare module 'launchdarkly-js-client-sdk' {

  export * from 'launchdarkly-js-sdk-common';
  import {
    BasicLoggerOptions,
    LDClientBase,
    LDContext,
    LDLogger,
    LDOptionsBase,
  } from 'launchdarkly-js-sdk-common';

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
   *     const client = initialize(envKey, context, options);
   *
   *     // Deprecated usage:
   *     import LaunchDarkly from 'launchdarkly-js-client-sdk';
   *     const client = LaunchDarkly.initialize(envKey, user, options);
   *
   * @param envKey
   *   The environment ID.
   * @param context
   *   The initial context properties. These can be changed later with [[LDClient.identify]].
   * @param options
   *   Optional configuration settings.
   * @return
   *   The new client instance.
   */
  export function initialize(envKey: string, context: LDContext, options?: LDOptions): LDClient;

  // This is @ignored because TypeDoc does not show default exports correctly. We'll just explain
  // the export situation in the comment for initialize().
  /** @ignore */
  const LaunchDarkly: {
    initialize: (envKey: string, context: LDContext, options?: LDOptions) => LDClient;
    version: string;
  };

  /** @ignore */ // see above
  export default LaunchDarkly;

  /**
   * Initialization options for the LaunchDarkly browser SDK.
   */
  export interface LDOptions extends LDOptionsBase {
    /**
     * The signed context key for Secure Mode.
     *
     * For more information, see the JavaScript SDK Reference Guide on
     * [Secure mode](https://docs.launchdarkly.com/sdk/features/secure-mode#configuring-secure-mode-in-the-javascript-client-side-sdk).
     */
    hash?: string;

    /**
     * Whether the client should make a request to LaunchDarkly for Experimentation metrics (goals).
     *
     * This is true by default, meaning that this request will be made on every page load.
     * Set it to false if you are not using Experimentation and want to skip the request.
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
     * Allows you to wait until the client has received metrics (goals) data from LaunchDarkly.
     *
     * This is only relevant if you are using Experimentation features like click events and
     * pageview events. Until the client has received the configuration for these, which
     * happens immediately after the initial request for feature flags, click events and
     * pageview events will not work, so you may wish to wait using this method before
     * doing anything that you expect to generate those events.
     *
     * The returned Promise will be resolved once the client has received metrics data. If
     * you prefer to use event handlers rather than Promises, you can listen on the client
     * for a `"goalsReady"` event instead.
     *
     * @returns
     *   A Promise containing the initialization state of the client.
     */
    waitUntilGoalsReady(): Promise<void>;
  }

  /**
   * Provides a simple [[LDLogger]] implementation.
   *
   * This logging implementation uses a simple format that includes only the log level
   * and the message text. By default, output is written to `console` methods (`console.info`
   * for normal informational messages, `console.warn` for warnings, `console.error` for
   * errors, and `console.log` for debug output) and the default minimum level is `info`
   * (that is, debug output is suppressed). You can filter by log level or change the output
   * destination with [[BasicLoggerOptions]].
   *
   * To use the logger created by this function, put it into [[LDOptions.logger]]. If
   * you do not set [[LDOptions.logger]] to anything, the SDK uses a default logger
   * that is equivalent to `ld.basicLogger({ level: 'info' })`.
   *
   * @param options Configuration for the logger. If no options are specified, the
   *   logger uses `{ level: 'info' }`.
   *
   * @example
   * This example shows how to use `basicLogger` in your SDK options to enable console
   * logging only at `warn` and `error` levels.
   * ```javascript
   *   const ldOptions = {
   *     logger: ld.basicLogger({ level: 'warn' }),
   *   };
   * ```
   */
   export function basicLogger(
    options?: BasicLoggerOptions
  ): LDLogger;
}
