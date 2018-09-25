// Type definitions for ldclient-js v2.1.2
// Project: https://github.com/launchdarkly/js-client
// Definitions by: Isaac Sukin <https://isaacsukin.com>

/**
 * The LaunchDarkly JavaScript client interfaces.
 *
 * Documentation: http://docs.launchdarkly.com/docs/js-sdk-reference
 */
declare module 'ldclient-js' {
  export const initialize: (envKey: string, user: LDUser, options?: LDOptions) => LDClient;
  export const version: string;

  const LaunchDarkly: {
    initialize: (envKey: string, user: LDUser, options?: LDOptions) => LDClient;
    version: string;
  };

  export default LaunchDarkly;

  /**
   * The names of events to which users of the client can subscribe.
   */
  export type LDEventName = 'ready' | 'change';

  /**
   * The types of values a feature flag can have.
   *
   * Flags can have any JSON-serializable value.
   */
  export type LDFlagValue = any;

  /**
   * A map of feature flags from their keys to their values.
   */
  export type LDFlagSet = {
    [key: string]: LDFlagValue;
  };

  /**
   * A map of feature flag keys to objects holding changes in their values.
   */
  export type LDFlagChangeset = {
    [key: string]: {
      current: LDFlagValue;
      previous: LDFlagValue;
    };
  };

  /**
   * The parameters required to (un)subscribe to/from LaunchDarkly events.
   *
   * See LDClient#on and LDClient#off.
   */
  type LDEventSignature = (
    key: LDEventName,
    callback: (current?: LDFlagValue | LDFlagChangeset, previous?: LDFlagValue) => void,
    context?: any
  ) => void;

  /**
   * LaunchDarkly initialization options.
   */
  export interface LDOptions {
    /**
     * The initial set of flags to use until the remote set is retrieved.
     *
     * If "localStorage" is specified, the flags will be saved and
     * retrieved from browser local storage. Alternatively, an LDFlagSet can
     * be specified which will be used as the initial source of flag values.
     */
    bootstrap?: 'localStorage' | LDFlagSet;

    /**
     * The signed user key for Secure Mode.
     */
    hash?: string;

    /**
     * The base url for the LaunchDarkly server.
     *
     * This is used for enterprise customers with their own LaunchDarkly instances.
     * Most users should use the default value.
     *
     */
    baseUrl?: string;

    /**
     * The url for the LaunchDarkly events server.
     *
     * This is used for enterprise customers with their own LaunchDarkly instances.
     * Most users should use the default value.
     *
     */
    eventsUrl?: string;

    /**
     * The url for the LaunchDarkly stream server.
     *
     * This is used for enterprise customers with their own LaunchDarkly instances.
     * Most users should use the default value.
     *
     */
    streamUrl?: string;

    /**
     * Whether or not to use the REPORT verb to fetch flag settings.
     *
     * If useReport is true, flag settings will be fetched with a REPORT request
     * including a JSON entity body with the user object.
     *
     * Otherwise (by default) a GET request will be issued with the user passed as
     * a base64 URL-encoded path parameter.
     *
     * Do not use unless advised by LaunchDarkly.
     */
    useReport?: boolean;

    /**
     * Whether or not to include custom headers in HTTP requests to LaunchDarkly; currently
     * these are used to track what version of the SDK is active. This defaults to true (custom
     * headers will be sent). One reason you might want to set it to false is that the presence
     * of custom headers causes browsers to make an extra OPTIONS request (a CORS preflight check)
     * before each flag request, which could affect performance.
     */
    sendLDHeaders?: boolean;

    /**
     * True if you want LaunchDarkly to provide additional information about how
     * flag values were calculated, which is then available through the client's
     * variationDetail() method. Since this increases the size of network requests,
     * such information is not sent unless you request it with this option.
     */
    evaluationExplanations?: boolean;

    /**
     * True (the default) if the client should make a request to LaunchDarkly for
     * A/B testing goals. By default, this request is made on every page load.
     * Set it to false if you are not using A/B testing and want to skip the request.
     */
    fetchGoals?: boolean;

    /**
     * True (the default) if the client should send analytics events to LaunchDarkly.
     * Set it to false if you are not using analytics events.
     */
    sendEvents?: boolean;
    
    /**
     * Whether all user attributes (except the user key) should be marked as
     * private, and not sent to LaunchDarkly.
     *
     * Defaults to false.
     */
    allAttributesPrivate?: boolean;

    /**
     * The names of user attributes that should be marked as private, and not sent
     * to LaunchDarkly.
     *
     * Must be a list of strings. Defaults to empty list.
     */
    privateAttributeNames?: Array<string>;

    /**
     * Whether or not to send an analytics event for a flag evaluation even if the same flag was
     * evaluated with the same value within the last five minutes. This defaults to false (duplicate
     * events within five minutes will be dropped).
     */
    allowFrequentDuplicateEvents?: boolean;

    /**
     * Whether analytics events should be sent only when you call variation (true), or also when you
     * call allFlags (false). This defaults to false (events will be sent in both cases).
     */
    sendEventsOnlyForVariation?: boolean;
  }

  /**
   * A LaunchDarkly user object.
   */
  export interface LDUser {
    /**
     * A unique string identifying a user.
     */
    key: string;

    /**
     * The user's name.
     *
     * You can search for users on the User page by name.
     */
    name?: string;

    /**
     * The user's first name.
     */
    firstName?: string;

    /**
     * The user's last name.
     */
    lastName?: string;

    /**
     * The user's email address.
     *
     * If an `avatar` URL is not provided, LaunchDarkly will use Gravatar
     * to try to display an avatar for the user on the Users page.
     */
    email?: string;

    /**
     * An absolute URL to an avatar image for the user.
     */
    avatar?: string;

    /**
     * The user's IP address.
     */
    ip?: string;

    /**
     * The country associated with the user.
     */
    country?: string;

    /**
     * Whether to show the user on the Users page in LaunchDarkly.
     */
    anonymous?: boolean;

    /**
     * Any additional attributes associated with the user.
     */
    custom?: {
      [key: string]: string | boolean | number | Array<string | boolean | number>;
    };
  }

  /**
   * Describes the reason that a flag evaluation produced a particular value. This is
   * part of the LDEvaluationDetail object returned by variationDetail().
   */
  export type LDEvaluationReason = {
    /**
     * The general category of the reason:
     *
     * 'OFF': the flag was off and therefore returned its configured off value
     *
     * 'FALLTHROUGH': the flag was on but the user did not match any targets or rules
     *
     * 'TARGET_MATCH': the user key was specifically targeted for this flag
     *
     * 'RULE_MATCH': the user matched one of the flag's rules
     *
     * 'PREREQUISITE_FAILED': the flag was considered off because it had at least one
     * prerequisite flag that either was off or did not return the desired variation
     *
     * 'ERROR': the flag could not be evaluated, e.g. because it does not exist or due
     * to an unexpected error
     */
    kind: string;

    /**
     * A further description of the error condition, if the kind was 'ERROR'.
     */
    errorKind?: string;

    /**
     * The index of the matched rule (0 for the first), if the kind was 'RULE_MATCH'.
     */
    ruleIndex?: number;

    /**
     * The unique identifier of the matched rule, if the kind was 'RULE_MATCH'.
     */
    ruleId?: string;

    /**
     * The key of the failed prerequisite flag, if the kind was 'PREREQUISITE_FAILED'.
     */
    prerequisiteKey?: string;
  };

  /**
   * An object returned by LDClient.variationDetail(), combining the result of a feature flag
   * evaluation with information about how it was calculated.
   */
  export type LDEvaluationDetail = {
    /**
     * The result of the flag evaluation. This will be either one of the flag's variations or
     * the default value that was passed to variationDetail().
     */
    value: LDFlagValue;

    /**
     * The index of the returned value within the flag's list of variations, e.g. 0 for the
     * first variation - or null if the default value was returned.
     */
    variationIndex?: number;

    /**
     * An object describing the main factor that influenced the flag evaluation value.
     * This will be null if you did not specify "explanationReasons: true" in your configuration.
     */
    reason: LDEvaluationReason;
  };
  
  /**
   * The LaunchDarkly client's instance interface.
   *
   * @see http://docs.launchdarkly.com/docs/js-sdk-reference
   */
  export interface LDClient {
    /**
     * Allows you to wait for client initialization using Promise syntax. The returned
     * Promise will be resolved once the client has either successfully initialized or
     * failed to initialize (e.g. due to an invalid environment key or a server error).
     * 
     * If you want to distinguish between these success and failure conditions, use
     * waitForInitialization() instead.
     * 
     * If you prefer to use event handlers rather than Promises, you can listen on the
     * client for a "ready" event.
     * 
     * @returns a Promise containing the initialization state of the client
     */
    waitUntilReady: () => Promise<void>;

    /**
     * Allows you to wait for client initialization using Promise syntax. The returned
     * Promise will be resolved if the client successfully initializes, or rejected (with
     * an error object) if it fails to initialize (e.g. due to an invalid environment key
     * or a server error). This is different from waitUntilReady(), which resolves the
     * Promise in either case.
     * 
     * If you prefer to use event handlers rather than Promises, you can listen on the
     * client for the events "initialized" and "failed".
     * 
     * @returns a Promise containing the initialization state of the client
     */
    waitForInitialization: () => Promise<void>;

    /**
     * Identifies a user to LaunchDarkly.
     *
     * This only needs to be called if the user changes identities because
     * normally the user's identity is set during client initialization.
     *
     * @param user
     *   A map of user options. Must contain at least the `key` property
     *   which identifies the user.
     * @param hash
     *   The signed user key for Secure Mode; see
     *   http://docs.launchdarkly.com/docs/js-sdk-reference#secure-mode
     * @param onDone
     *   A callback to invoke after the user is identified.
     */
    identify: (user: LDUser, hash?: string, onDone?: (err: Error | null, flags: LDFlagSet | null) => void) => Promise<void>;

    /**
     * Flushes pending events asynchronously.
     *
     * @param onDone
     *   A callback to invoke after the events were flushed.
     */
    flush: (onDone?: Function) => Promise<void>;

    /**
     * Retrieves a flag's value.
     *
     * @param key
     *   The key of the flag for which to retrieve the corresponding value.
     * @param defaultValue
     *   The value to use if the flag is not available (for example, if the
     *   user is offline or a flag is requested that does not exist).
     *
     * @returns
     *   The flag's value.
     */
    variation: (key: string, defaultValue?: LDFlagValue) => LDFlagValue;

    /**
     * Retrieves a flag's value, along with information about how it was calculated, in the form
     * of an LDEvaluationDetail object. Note that the "reason" property will only have a value
     * if you specified "evaluationExplanations: true" in your configuration.
     *
     * The reason property of the result will also be included in analytics events, if you are
     * capturing detailed event data for this flag.
     *
     * @param key
     *   The key of the flag for which to retrieve the corresponding value.
     * @param defaultValue
     *   The value to use if the flag is not available (for example, if the
     *   user is offline or a flag is requested that does not exist).
     *
     * @returns LDEvaluationDetail object containing the value and explanation.
     */
    variationDetail: (key: string, defaultValue?: LDFlagValue) => LDEvaluationDetail;

    /**
     * Registers an event listener.
     *
     * @param key
     *   The name of the event for which to listen. This can be "ready",
     *   "change", or "change:FLAG-KEY".
     * @param callback
     *   The function to execute when the event fires. For the "change"
     *   event, the callback receives one parameter: an LDFlagChangeset
     *   describing the changes. For "change:FLAG-KEY" events, the callback
     *   receives two parameters: the current (new) value and the previous
     *   value of the relevant flag.
     * @param context
     *   The "this" context to use for the callback.
     */
    on: LDEventSignature;

    /**
     * Deregisters an event listener.
     *
     * @param key
     *   The name of the event for which to stop listening. This can be
     *   "ready", "change", or "change:FLAG-KEY".
     * @param callback
     *   The function to deregister.
     * @param context
     *   The "this" context for the callback.
     */
    off: LDEventSignature;

    /**
     * Track page events to use in goals or A/B tests.
     *
     * LaunchDarkly automatically tracks pageviews and clicks that are
     * specified in the Goals section of their dashboard. This can be used
     * to track custom goals or other events that do not currently have
     * goals.
     *
     * @param key
     *   The event to record.
     * @param data
     *   Additional information to associate with the event.
     */
    track: (key: string, data?: any) => void;

    /**
     * Returns a map of all available flags to the current user's values.
     */
    allFlags: () => LDFlagSet;
  }
}
