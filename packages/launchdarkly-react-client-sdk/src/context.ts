import { createContext } from 'react';
import { LDClient, LDFlagSet } from 'launchdarkly-js-client-sdk';

/**
 * The LaunchDarkly context stored in the Provider state and passed to consumers.
 */
interface LDContext {
  /**
   * Contains all flags from LaunchDarkly. This object will always exist but will be empty {} initially
   * until flags are fetched from the LaunchDarkly servers.
   */
  flags: LDFlagSet;

  /**
   * The LaunchDarkly client's instance interface. This will be be undefined initially until
   * initialization is complete.
   *
   * @see http://docs.launchdarkly.com/docs/js-sdk-reference
   */
  ldClient?: LDClient;
}

const context = createContext<LDContext>({ flags: {}, ldClient: undefined });
const { Provider, Consumer } = context;

export { Provider, Consumer, LDContext };
export default context;
